/**
 * Upload-to-Quality-Check Pipeline (#429).
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA) initiative for AudioBlock.
 * Orchestrates the end-to-end verification of uploaded tracks:
 * 1. Admin/Trusted Artist exemption pre-checks (`lib/qualityChecks.ts`).
 * 2. Audio preprocessing — metadata normalization, container/level checks (`lib/audioPreprocessing.ts`, #406).
 * 2b. Plagiarism & duplicate detection (`lib/plagiarismDetection.ts`).
 * 3. Queue monitoring & heartbeat registration (`lib/analysisQueueMonitor.ts`).
 * 4. NVIDIA AI quality assessment for single track or stems (`lib/songQualityFilter.ts`, `lib/stemAnalysis.ts`),
 *    with cost/usage tracking for the NVIDIA call (`lib/nvidiaUsageTracking.ts`, #424).
 * 5. Configurable genre quality threshold evaluation (`lib/qualityThresholds.ts`).
 * 6. Platform analytics logging (`lib/qualityAnalytics.ts`).
 * 7. Anything short of a clean approval is sent to the admin review queue
 *    (`lib/flaggedTrackReview.ts`, #418) instead of being final on the spot.
 *
 * Rate limiting NVIDIA calls (#423, `lib/nvidiaRateLimiter.ts`) and the
 * re-upload flow after a failed check (#421, `lib/reUploadFlow.ts`) compose
 * around this pipeline rather than living inside it — see those modules.
 */

import { canSkipQualityCheck, type QualityCheckSubject } from './qualityChecks';
import {
  checkPlagiarism,
  registerTrackFingerprint,
  generateAudioFingerprint,
  type PlagiarismCheckResult,
} from './plagiarismDetection';
import {
  analyzeSongQuality,
  type SongQualityAssessment,
  type SongQualityOptions,
} from './songQualityFilter';
import { analyzeStemUpload, type MultiTrackAnalysis, type StemUpload } from './stemAnalysis';
import { getGenreThreshold, evaluateQualityScoreAgainstGenre } from './qualityThresholds';
import { recordQualityCheckResult } from './qualityAnalytics';
import { AnalysisQueueMonitor } from './analysisQueueMonitor';
import { detectExplicitContent, type ExplicitDetectionResult } from './explicitContentDetection';
import { preprocessAudio, type PreprocessedAudio } from './audioPreprocessing';
import {
  analyzeLoudnessAndSuggest,
  type LoudnessNormalizationSuggestion,
} from './loudnessNormalization';
import { recordNvidiaUsage } from './nvidiaUsageTracking';
import { flagTrackForReview } from './flaggedTrackReview';

export type PipelineVerdict = 'approved' | 'review' | 'rejected' | 'skipped';

export interface UploadQualityPipelineInput {
  trackId: string;
  title: string;
  artist?: string;
  genre?: string;
  durationSeconds?: number;
  lyrics?: string;
  audioBuffer?: ArrayBuffer | Uint8Array | string;
  audioHash?: string;
  spectralFeatures?: number[];
  stems?: StemUpload[];
  subject?: QualityCheckSubject | null;
  integratedLufs?: number;
  truePeakDbtp?: number;
}

export interface UploadQualityPipelineOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  queueMonitor?: AnalysisQueueMonitor;
  skipPlagiarismCheck?: boolean;
}

export interface UploadQualityPipelineResult {
  trackId: string;
  status: PipelineVerdict;
  score: number;
  genre: string;
  genreThreshold: number;
  passedGenreThreshold: boolean;
  exempt: boolean;
  plagiarismCheck?: PlagiarismCheckResult;
  assessment?: SongQualityAssessment;
  stemAnalysis?: MultiTrackAnalysis;
  explicitCheck?: ExplicitDetectionResult;
  loudnessSuggestion?: LoudnessNormalizationSuggestion;
  /** Result of the pre-AI preprocessing step (#406). */
  preprocessing?: PreprocessedAudio;
  reasons: string[];
  processedAt: number;
}

/**
 * Runs an uploaded song through the complete quality check and verification pipeline.
 */
export async function processUploadQualityCheck(
  input: UploadQualityPipelineInput,
  options: UploadQualityPipelineOptions = {}
): Promise<UploadQualityPipelineResult> {
  const processedAt = Date.now();
  const genre = input.genre ? input.genre.trim() : 'Default';
  const genreThreshold = getGenreThreshold(genre);
  const queueMonitor = options.queueMonitor;

  // Compute explicit content detection and loudness normalization suggestions
  const explicitCheck = detectExplicitContent({
    trackId: input.trackId,
    title: input.title,
    lyrics: input.lyrics,
    artist: input.artist,
    genre: input.genre,
  });

  const loudnessSuggestion = analyzeLoudnessAndSuggest({
    trackId: input.trackId,
    integratedLufs: input.integratedLufs,
    truePeakDbtp: input.truePeakDbtp,
    spectralFeatures: input.spectralFeatures,
    audioBuffer: input.audioBuffer,
    durationSeconds: input.durationSeconds,
  });

  // 1. Check for role-based / admin-approved exemption
  if (canSkipQualityCheck(input.subject)) {
    recordQualityCheckResult({
      trackId: input.trackId,
      outcome: 'passed',
      score: 1.0,
      recordedAt: processedAt,
    });

    return {
      trackId: input.trackId,
      status: 'skipped',
      score: 100,
      genre,
      genreThreshold,
      passedGenreThreshold: true,
      exempt: true,
      explicitCheck,
      loudnessSuggestion,
      reasons: ['Quality check bypassed for exempt/admin-approved artist.'],
      processedAt,
    };
  }

  // 2. Preprocess before AI analysis (#406): normalize the metadata the model
  // sees and reject uploads that can't be analysed (empty / silent audio,
  // invalid duration) without spending an NVIDIA API call.
  const preprocessing = preprocessAudio({
    title: input.title,
    artist: input.artist,
    genre: input.genre,
    lyrics: input.lyrics,
    durationSeconds: input.durationSeconds,
    audioBuffer: input.audioBuffer,
  });
  if (!preprocessing.ok) {
    recordQualityCheckResult({
      trackId: input.trackId,
      outcome: 'failed',
      score: 0.0,
      recordedAt: processedAt,
    });

    return {
      trackId: input.trackId,
      status: 'rejected',
      score: 0,
      genre,
      genreThreshold,
      passedGenreThreshold: false,
      exempt: false,
      explicitCheck,
      loudnessSuggestion,
      preprocessing,
      reasons: [`Rejected during audio preprocessing: ${preprocessing.rejectReason}`],
      processedAt,
    };
  }
  const meta = preprocessing.metadata;

  // 2b. Plagiarism & duplicate pre-screening
  let plagiarismResult: PlagiarismCheckResult | undefined;
  if (!options.skipPlagiarismCheck) {
    plagiarismResult = checkPlagiarism({
      trackId: input.trackId,
      title: input.title,
      artist: input.artist,
      genre: input.genre,
      durationSeconds: input.durationSeconds,
      audioHash: input.audioHash,
      spectralFeatures: input.spectralFeatures,
    });

    // If confirmed duplicate, reject immediately without calling AI API
    if (plagiarismResult.isDuplicate) {
      recordQualityCheckResult({
        trackId: input.trackId,
        outcome: 'failed',
        score: 0.0,
        recordedAt: processedAt,
      });

      const reasons = [`Rejected by plagiarism detector: ${plagiarismResult.reasons.join(' ')}`];
      // #418: a rejection still goes to the admin review queue rather than
      // being final on the spot — a plagiarism false positive needs a human
      // to overturn it, not a re-run of the same detector.
      flagTrackForReview({
        trackId: input.trackId,
        title: input.title,
        artist: input.artist,
        genre,
        score: 0,
        reasons,
        source: 'rejected',
      });

      return {
        trackId: input.trackId,
        status: 'rejected',
        score: 0,
        genre,
        genreThreshold,
        passedGenreThreshold: false,
        exempt: false,
        plagiarismCheck: plagiarismResult,
        explicitCheck,
        loudnessSuggestion,
        preprocessing,
        reasons,
        processedAt,
      };
    }
  }

  // 3. Register with queue monitor
  if (queueMonitor) {
    queueMonitor.register(input.trackId);
    queueMonitor.heartbeat(input.trackId);
  }

  // 4. AI Quality Analysis (Stem-based or Single Track)
  const apiKey = options.apiKey || process.env.NVIDIA_API_KEY || 'test-key';
  const songQualityOptions: SongQualityOptions = {
    apiKey,
    baseUrl: options.baseUrl,
    model: options.model,
    fetchImpl: options.fetchImpl,
  };

  let assessment: SongQualityAssessment | undefined;
  let stemAnalysis: MultiTrackAnalysis | undefined;
  let rawScore = 0;
  let reasons: string[] = [];

  try {
    if (input.stems && input.stems.length > 0) {
      stemAnalysis = await analyzeStemUpload(input.stems, (stem) =>
        analyzeSongQuality(
          {
            title: `${meta.title} — ${stem.role}`,
            artist: meta.artist,
            genre: meta.genre,
          },
          songQualityOptions
        )
      );

      rawScore = stemAnalysis.overall.score;
      if (stemAnalysis.overall.verdict === 'rejected') {
        reasons.push('One or more stems failed acoustic quality inspection.');
      } else if (stemAnalysis.overall.verdict === 'review') {
        reasons.push('Multi-track stem assessment flagged for manual review.');
      }
    } else {
      assessment = await analyzeSongQuality(
        {
          title: meta.title,
          artist: meta.artist,
          genre: meta.genre,
          durationSeconds: meta.durationSeconds,
          lyrics: meta.lyrics,
        },
        songQualityOptions
      );

      rawScore = assessment.score;
      reasons.push(...assessment.reasons);

      // #424: turn the token usage NVIDIA reported into an estimated cost.
      if (assessment.usage) {
        recordNvidiaUsage({
          trackId: input.trackId,
          model: assessment.model,
          ...assessment.usage,
        });
      }
    }

    if (queueMonitor) {
      queueMonitor.heartbeat(input.trackId);
    }
  } catch (err) {
    if (queueMonitor) {
      queueMonitor.complete(input.trackId);
    }

    recordQualityCheckResult({
      trackId: input.trackId,
      outcome: 'timeout',
      recordedAt: processedAt,
    });

    const errorMsg = err instanceof Error ? err.message : 'Quality check service unavailable';
    const reasons = [`Analysis error (${errorMsg}); sent to manual review queue.`];
    flagTrackForReview({
      trackId: input.trackId,
      title: input.title,
      artist: input.artist,
      genre,
      score: 0,
      reasons,
      source: 'review',
    });

    return {
      trackId: input.trackId,
      status: 'review',
      score: 0,
      genre,
      genreThreshold,
      passedGenreThreshold: false,
      exempt: false,
      plagiarismCheck: plagiarismResult,
      explicitCheck,
      loudnessSuggestion,
      preprocessing,
      reasons,
      processedAt,
    };
  }

  // 5. Evaluate against configurable genre thresholds
  const genreEvaluation = evaluateQualityScoreAgainstGenre(rawScore, genre);
  const passedGenreThreshold = genreEvaluation.passed;

  let finalStatus: PipelineVerdict = 'approved';

  if (!passedGenreThreshold) {
    // If score is significantly below genre threshold, reject; otherwise send to review
    if (genreEvaluation.scoreNormalized < genreThreshold - 0.15) {
      finalStatus = 'rejected';
      reasons.push(
        `Quality score (${rawScore}/100) failed ${genre} minimum threshold (${Math.round(genreThreshold * 100)}/100).`
      );
    } else {
      finalStatus = 'review';
      reasons.push(
        `Quality score (${rawScore}/100) is borderline for ${genre} threshold (${Math.round(genreThreshold * 100)}/100).`
      );
    }
  } else if (assessment?.verdict === 'rejected' || stemAnalysis?.overall.verdict === 'rejected') {
    finalStatus = 'rejected';
  } else if (
    assessment?.verdict === 'review' ||
    stemAnalysis?.overall.verdict === 'review' ||
    plagiarismResult?.verdict === 'suspicious'
  ) {
    finalStatus = 'review';
    if (plagiarismResult?.verdict === 'suspicious') {
      reasons.push(plagiarismResult.reasons[0]);
    }
  }

  // 6. Record analytics & complete queue job
  recordQualityCheckResult({
    trackId: input.trackId,
    outcome:
      finalStatus === 'approved' ? 'passed' : finalStatus === 'rejected' ? 'failed' : 'failed',
    score: rawScore / 100,
    recordedAt: processedAt,
  });

  if (queueMonitor) {
    queueMonitor.complete(input.trackId);
  }

  // 7. If approved, register fingerprint for future duplicate screening.
  // Otherwise (rejected or borderline), send it to the admin review queue
  // (#418) — the automated verdict is not the last word.
  if (finalStatus === 'approved') {
    const fp = generateAudioFingerprint({
      trackId: input.trackId,
      title: input.title,
      artist: input.artist,
      genre: input.genre,
      durationSeconds: input.durationSeconds,
      audioHash: input.audioHash,
      spectralFeatures: input.spectralFeatures,
    });
    registerTrackFingerprint(fp);
  } else {
    flagTrackForReview({
      trackId: input.trackId,
      title: input.title,
      artist: input.artist,
      genre,
      score: rawScore,
      reasons,
      // finalStatus is never 'skipped' here (that path already returned in
      // step 1) or 'approved' (excluded by the enclosing branch).
      source: finalStatus === 'rejected' ? 'rejected' : 'review',
    });
  }

  return {
    trackId: input.trackId,
    status: finalStatus,
    score: rawScore,
    genre,
    genreThreshold,
    passedGenreThreshold,
    exempt: false,
    plagiarismCheck: plagiarismResult,
    assessment,
    stemAnalysis,
    explicitCheck,
    loudnessSuggestion,
    preprocessing,
    reasons: [...preprocessing.warnings, ...reasons],
    processedAt,
  };
}
