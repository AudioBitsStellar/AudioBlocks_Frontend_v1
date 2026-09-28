/**
 * Upload-to-Quality-Check Pipeline (#429).
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA) initiative for AudioBlock.
 * Orchestrates the end-to-end verification of uploaded tracks:
 * 1. Admin/Trusted Artist exemption pre-checks (`lib/qualityChecks.ts`).
 * 2. Audio preprocessing — metadata normalization, container/level checks (`lib/audioPreprocessing.ts`, #406).
 * 2b. Plagiarism & duplicate detection (`lib/plagiarismDetection.ts`).
 * 3. Queue monitoring & heartbeat registration (`lib/analysisQueueMonitor.ts`).
 * 4. NVIDIA AI quality assessment for single track or stems (`lib/songQualityFilter.ts`, `lib/stemAnalysis.ts`).
 * 5. Configurable genre quality threshold evaluation (`lib/qualityThresholds.ts`).
 * 6. Platform analytics logging (`lib/qualityAnalytics.ts`).
 */

import { AnalysisQueueMonitor } from './analysisQueueMonitor';
import { preprocessAudio, type PreprocessedAudio } from './audioPreprocessing';
import { detectExplicitContent, type ExplicitDetectionResult } from './explicitContentDetection';
import {
  analyzeLoudnessAndSuggest,
  type LoudnessNormalizationSuggestion,
} from './loudnessNormalization';
import {
  checkPlagiarism,
  registerTrackFingerprint,
  generateAudioFingerprint,
  type PlagiarismCheckResult,
} from './plagiarismDetection';
import { recordQualityCheckResult } from './qualityAnalytics';
import { canSkipQualityCheck, type QualityCheckSubject } from './qualityChecks';
import { getGenreThreshold, evaluateQualityScoreAgainstGenre } from './qualityThresholds';
import {
  analyzeSongQuality,
  type SongQualityAssessment,
  type SongQualityOptions,
} from './songQualityFilter';
import { analyzeStemUpload, type StemUploadAnalysis, type AudioStem } from './stemAnalysis';

export type PipelineVerdict = 'approved' | 'review' | 'rejected' | 'skipped';

/**
 * Classifies the type of Mastra agent / NVIDIA API failure so the UI can
 * render the appropriate MastraAgentFallback state (#426).
 *
 * - 'timeout'     — AbortError: the NVIDIA API call exceeded REQUEST_TIMEOUT_MS.
 * - 'api-error'   — Non-OK HTTP response (4xx / 5xx) from the NVIDIA endpoint.
 * - 'parse-error' — The model returned an answer but no valid JSON could be extracted.
 * - 'unknown'     — Any other unexpected error inside the Mastra agent.
 */
export type MastraAgentErrorType = 'timeout' | 'api-error' | 'parse-error' | 'unknown';

/**
 * Classifies a caught error thrown by `analyzeSongQuality` or `analyzeStemUpload`
 * into one of the four `MastraAgentErrorType` categories.
 *
 * @internal exported for unit-testing only — callers should rely on the
 * `mastraErrorType` field of `UploadQualityPipelineResult` instead.
 */
export function classifyMastraError(err: unknown): MastraAgentErrorType {
  if (err instanceof Error) {
    if (err.name === 'AbortError' || err.message.includes('timed out')) {
      return 'timeout';
    }
    if (err.message.includes('failed with status') || err.message.includes('API request failed')) {
      return 'api-error';
    }
    if (
      err.message.includes('did not contain a JSON') ||
      err.message.includes('unexpected response shape')
    ) {
      return 'parse-error';
    }
  }
  return 'unknown';
}

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
  stems?: AudioStem[];
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
  stemAnalysis?: StemUploadAnalysis;
  explicitCheck?: ExplicitDetectionResult;
  loudnessSuggestion?: LoudnessNormalizationSuggestion;
  /** Result of the pre-AI preprocessing step (#406). */
  preprocessing?: PreprocessedAudio;
  /**
   * Set when the Mastra AI agent (NVIDIA-backed quality check) encountered an
   * error. Populated so the frontend can render the appropriate
   * `MastraAgentFallback` state (#426).
   */
  mastraErrorType?: MastraAgentErrorType;
  /** Raw error message from the Mastra agent failure (sanitised before display). */
  mastraErrorDetail?: string;
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
        reasons: [`Rejected by plagiarism detector: ${plagiarismResult.reasons.join(' ')}`],
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
  let stemAnalysis: StemUploadAnalysis | undefined;
  let rawScore = 0;
  const reasons: string[] = [];

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

      rawScore = stemAnalysis.score;
      if (stemAnalysis.verdict === 'rejected') {
        reasons.push('One or more stems failed acoustic quality inspection.');
      } else if (stemAnalysis.verdict === 'review') {
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
    // Classify the error so the UI can render the right MastraAgentFallback state (#426).
    const mastraErrorType = classifyMastraError(err);
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
      mastraErrorType,
      mastraErrorDetail: errorMsg,
      reasons: [`Analysis error (${errorMsg}); sent to manual review queue.`],
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
  } else if (assessment?.verdict === 'rejected' || stemAnalysis?.verdict === 'rejected') {
    finalStatus = 'rejected';
  } else if (
    assessment?.verdict === 'review' ||
    stemAnalysis?.verdict === 'review' ||
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

  // 7. If approved, register fingerprint for future duplicate screening
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
