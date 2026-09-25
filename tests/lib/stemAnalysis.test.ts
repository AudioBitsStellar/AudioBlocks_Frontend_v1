import { describe, it, expect, vi } from 'vitest';
import { aggregateVerdict, analyzeStemUpload, StemUpload } from '../../lib/stemAnalysis';
import { SongQualityAssessment } from '../../lib/songQualityFilter';

const STEMS: StemUpload[] = [
  { id: 'stem-1', name: 'lead-vocal.wav', role: 'vocals', url: 'https://ipfs.io/ipfs/stem-1' },
  { id: 'stem-2', name: 'drums.wav', role: 'drums', url: 'https://ipfs.io/ipfs/stem-2' },
];

function assessment(
  score: number,
  verdict: SongQualityAssessment['verdict']
): SongQualityAssessment {
  return { score, verdict, reasons: ['ok'], model: 'nvidia/llama-3.1-nemotron-70b-instruct' };
}

describe('stemAnalysis', () => {
  describe('aggregateVerdict', () => {
    it('approves only when every stem is approved', () => {
      expect(aggregateVerdict(['approved', 'approved'])).toBe('approved');
    });

    it('rejects the upload when any stem is rejected', () => {
      expect(aggregateVerdict(['approved', 'rejected'])).toBe('rejected');
    });

    it('sends the upload to review when any stem is in review', () => {
      expect(aggregateVerdict(['approved', 'review'])).toBe('review');
    });

    it('approves an empty verdict list', () => {
      expect(aggregateVerdict([])).toBe('approved');
    });
  });

  describe('analyzeStemUpload', () => {
    it('analyzes every stem and averages the scores', async () => {
      const analyzeStem = vi
        .fn()
        .mockResolvedValueOnce(assessment(80, 'approved'))
        .mockResolvedValueOnce(assessment(60, 'approved'));

      const result = await analyzeStemUpload(STEMS, analyzeStem);

      expect(analyzeStem).toHaveBeenCalledTimes(2);
      expect(analyzeStem).toHaveBeenNthCalledWith(1, STEMS[0]);
      expect(analyzeStem).toHaveBeenNthCalledWith(2, STEMS[1]);
      expect(result.overall).toEqual({ score: 70, verdict: 'approved' });
      expect(result.stems[0].assessment?.score).toBe(80);
    });

    it('rejects the upload when any stem is rejected', async () => {
      const analyzeStem = vi
        .fn()
        .mockResolvedValueOnce(assessment(90, 'approved'))
        .mockResolvedValueOnce(assessment(10, 'rejected'));

      const result = await analyzeStemUpload(STEMS, analyzeStem);

      expect(result.overall.verdict).toBe('rejected');
    });

    it('downgrades the verdict when a stem fails to analyze', async () => {
      const analyzeStem = vi
        .fn()
        .mockResolvedValueOnce(assessment(90, 'approved'))
        .mockRejectedValueOnce(new Error('NVIDIA API request failed with status 500'));

      const result = await analyzeStemUpload(STEMS, analyzeStem);

      expect(result.stems[1]).toMatchObject({
        assessment: null,
        error: 'NVIDIA API request failed with status 500',
      });
      expect(result.overall).toEqual({ score: 90, verdict: 'review' });
    });

    it('reports a review verdict when every stem fails', async () => {
      const analyzeStem = vi.fn().mockRejectedValue(new Error('NVIDIA API request failed'));

      const result = await analyzeStemUpload(STEMS, analyzeStem);

      expect(result.overall).toEqual({ score: 0, verdict: 'review' });
      expect(result.stems.every((stem) => stem.assessment === null)).toBe(true);
    });

    it('requires at least one stem', async () => {
      const analyzeStem = vi.fn();

      await expect(analyzeStemUpload([], analyzeStem)).rejects.toThrow(
        'at least one stem'
      );
      expect(analyzeStem).not.toHaveBeenCalled();
    });
  });
});
