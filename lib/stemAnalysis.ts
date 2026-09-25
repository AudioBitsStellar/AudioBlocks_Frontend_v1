/**
 * Support for analyzing stems/multi-track uploads (#452).
 *
 * Artists upload multi-track projects as individual stems (vocals, drums,
 * bass, and so on) rather than one bounced file. This module runs the AI Song
 * Quality Filter (`lib/songQualityFilter.ts`) on every stem of an upload and
 * aggregates the per-stem assessments into one multi-track verdict, so the
 * filter treats the upload as a whole instead of as unrelated files.
 */

import type { QualityVerdict, SongQualityAssessment } from './songQualityFilter';

export interface StemUpload {
  id: string;
  name: string;
  /** Stem role within the project, e.g. "vocals", "drums", "bass", "other". */
  role: string;
  url: string;
}

export interface StemAnalysisResult {
  stem: StemUpload;
  /** Assessment for this stem, or null when the stem could not be analyzed. */
  assessment: SongQualityAssessment | null;
  /** Present when the stem analysis failed. */
  error?: string;
}

export interface MultiTrackAnalysis {
  stems: StemAnalysisResult[];
  overall: {
    score: number;
    verdict: QualityVerdict;
  };
}

/**
 * Combines per-stem verdicts: a single rejected stem rejects the upload, any
 * review or failed stem sends it to manual review, otherwise it is approved.
 */
export function aggregateVerdict(verdicts: QualityVerdict[]): QualityVerdict {
  if (verdicts.includes('rejected')) return 'rejected';
  if (verdicts.includes('review')) return 'review';
  return 'approved';
}

/**
 * Analyzes every stem of a multi-track upload in parallel and aggregates the
 * results into a single verdict for the upload.
 *
 * @param stems - The stems of the upload to analyze.
 * @param analyzeStem - Analyzes one stem (typically `analyzeSongQuality`
 *   bound to the stem's metadata). Injectable so callers can test or swap the
 *   analysis backend.
 * @returns The per-stem results plus the overall upload verdict.
 * @throws Error when the upload contains no stems.
 */
export async function analyzeStemUpload(
  stems: StemUpload[],
  analyzeStem: (stem: StemUpload) => Promise<SongQualityAssessment>
): Promise<MultiTrackAnalysis> {
  if (stems.length === 0) {
    throw new Error('A multi-track upload requires at least one stem');
  }

  const settled = await Promise.allSettled(stems.map((stem) => analyzeStem(stem)));

  const results: StemAnalysisResult[] = settled.map((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      return { stem: stems[index], assessment: outcome.value };
    }
    return {
      stem: stems[index],
      assessment: null,
      error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
    };
  });

  const successful = results.flatMap((result) => (result.assessment ? [result.assessment] : []));
  const score =
    successful.length > 0
      ? Math.round(
          successful.reduce((total, assessment) => total + assessment.score, 0) / successful.length
        )
      : 0;
  const verdicts: QualityVerdict[] = successful.map((assessment) => assessment.verdict);
  // A stem that could not be analyzed must not slip through as approved.
  for (const result of results) {
    if (!result.assessment) verdicts.push('review');
  }

  return { stems: results, overall: { score, verdict: aggregateVerdict(verdicts) } };
}
