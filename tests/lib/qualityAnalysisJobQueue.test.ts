import { describe, it, expect, vi } from 'vitest';
import { AnalysisQueueMonitor } from '../../lib/analysisQueueMonitor';
import { QualityAnalysisJobQueue } from '../../lib/qualityAnalysisJobQueue';
import type {
  UploadQualityPipelineInput,
  UploadQualityPipelineResult,
} from '../../lib/uploadQualityPipeline';

function input(trackId: string): UploadQualityPipelineInput {
  return { trackId, title: `Track ${trackId}` };
}

function result(trackId: string): UploadQualityPipelineResult {
  return {
    trackId,
    status: 'approved',
    score: 90,
    genre: 'Default',
    genreThreshold: 70,
    passedGenreThreshold: true,
    exempt: false,
    reasons: [],
    processedAt: 0,
  };
}

/** A promise plus its resolve/reject, so a test can control exactly when "processing" finishes. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Waits for pending microtasks (enqueue's synchronous drain -> async run) to settle. */
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('QualityAnalysisJobQueue', () => {
  it('returns a job id immediately without waiting for processing', () => {
    const processFn = vi.fn(() => new Promise<UploadQualityPipelineResult>(() => {}));
    const queue = new QualityAnalysisJobQueue({ processFn, idFn: () => 'job-1' });

    const id = queue.enqueue(input('t1'));

    expect(id).toBe('job-1');
    expect(queue.getJob('job-1')?.status).toMatch(/queued|processing/);
  });

  it('transitions queued -> processing -> completed with the pipeline result', async () => {
    const d = deferred<UploadQualityPipelineResult>();
    const processFn = vi.fn(() => d.promise);
    const queue = new QualityAnalysisJobQueue({ processFn, idFn: () => 'job-1' });

    const id = queue.enqueue(input('t1'));
    await flush();
    expect(queue.getJob(id)?.status).toBe('processing');

    d.resolve(result('t1'));
    await flush();

    const job = queue.getJob(id);
    expect(job?.status).toBe('completed');
    expect(job?.result).toEqual(result('t1'));
    expect(job?.finishedAt).toBeDefined();
  });

  it('marks a job failed with the error message when the pipeline throws', async () => {
    const processFn = vi.fn().mockRejectedValue(new Error('NVIDIA API unreachable'));
    const queue = new QualityAnalysisJobQueue({ processFn, idFn: () => 'job-1' });

    const id = queue.enqueue(input('t1'));
    await flush();
    await flush();

    const job = queue.getJob(id);
    expect(job?.status).toBe('failed');
    expect(job?.error).toBe('NVIDIA API unreachable');
  });

  it('caps simultaneous processing at the configured concurrency', async () => {
    const deferreds = [
      deferred<UploadQualityPipelineResult>(),
      deferred<UploadQualityPipelineResult>(),
      deferred<UploadQualityPipelineResult>(),
    ];
    let call = 0;
    const processFn = vi.fn(() => deferreds[call++].promise);
    let nextId = 0;
    const queue = new QualityAnalysisJobQueue({
      processFn,
      concurrency: 2,
      idFn: () => `job-${nextId++}`,
    });

    queue.enqueue(input('t0'));
    queue.enqueue(input('t1'));
    queue.enqueue(input('t2'));
    await flush();

    expect(queue.getJob('job-0')?.status).toBe('processing');
    expect(queue.getJob('job-1')?.status).toBe('processing');
    expect(queue.getJob('job-2')?.status).toBe('queued');
    expect(queue.activeCount).toBe(2);
    expect(queue.queueLength).toBe(1);

    deferreds[0].resolve(result('t0'));
    await flush();
    await flush();

    expect(queue.getJob('job-0')?.status).toBe('completed');
    expect(queue.getJob('job-2')?.status).toBe('processing');
  });

  it('returns undefined for an unknown job id', () => {
    const queue = new QualityAnalysisJobQueue({ processFn: vi.fn() });
    expect(queue.getJob('nope')).toBeUndefined();
  });

  it('lists jobs oldest-enqueued first', () => {
    let t = 0;
    const queue = new QualityAnalysisJobQueue({
      processFn: () => new Promise(() => {}),
      now: () => t++,
      idFn: () => `job-${t}`,
    });

    queue.enqueue(input('a'));
    queue.enqueue(input('b'));

    expect(queue.listJobs().map((j) => j.trackId)).toEqual(['a', 'b']);
  });

  it('registers each job with the queue monitor and completes it on finish', async () => {
    const monitor = new AnalysisQueueMonitor();
    const registerSpy = vi.spyOn(monitor, 'register');
    const completeSpy = vi.spyOn(monitor, 'complete');
    const processFn = vi.fn().mockResolvedValue(result('t1'));
    const queue = new QualityAnalysisJobQueue({
      processFn,
      queueMonitor: monitor,
      idFn: () => 'job-1',
    });

    queue.enqueue(input('t1'));
    await flush();
    await flush();

    expect(registerSpy).toHaveBeenCalledWith('job-1', expect.any(Number));
    expect(completeSpy).toHaveBeenCalledWith('job-1');
  });

  it('passes the shared queue monitor through to the pipeline call', async () => {
    const monitor = new AnalysisQueueMonitor();
    const processFn = vi.fn().mockResolvedValue(result('t1'));
    const queue = new QualityAnalysisJobQueue({
      processFn,
      queueMonitor: monitor,
      idFn: () => 'job-1',
    });

    queue.enqueue(input('t1'));
    await flush();
    await flush();

    expect(processFn).toHaveBeenCalledWith(
      input('t1'),
      expect.objectContaining({ queueMonitor: monitor })
    );
  });
});
