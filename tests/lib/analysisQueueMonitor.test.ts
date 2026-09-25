import { describe, it, expect, vi } from 'vitest';
import { AnalysisQueueMonitor, StuckAnalysisJob } from '../../lib/analysisQueueMonitor';

const T0 = 1_000_000;
const FIVE_MINUTES = 5 * 60 * 1000;

describe('analysisQueueMonitor', () => {
  it('does not report a job that is still sending heartbeats', () => {
    const monitor = new AnalysisQueueMonitor({ stuckThresholdMs: FIVE_MINUTES });
    monitor.register('job-1', T0);
    monitor.heartbeat('job-1', T0 + 60_000);

    expect(monitor.check(T0 + 90_000)).toEqual([]);
  });

  it('reports a job as stuck once it outlives the threshold', () => {
    const monitor = new AnalysisQueueMonitor({ stuckThresholdMs: FIVE_MINUTES });
    monitor.register('job-1', T0);

    const stuck = monitor.check(T0 + FIVE_MINUTES + 1_000);

    expect(stuck).toHaveLength(1);
    expect(stuck[0]).toMatchObject({
      id: 'job-1',
      startedAt: T0,
      lastHeartbeatAt: T0,
      stuckForMs: FIVE_MINUTES + 1_000,
    });
  });

  it('a heartbeat resets the stuck timer', () => {
    const monitor = new AnalysisQueueMonitor({ stuckThresholdMs: FIVE_MINUTES });
    monitor.register('job-1', T0);
    monitor.heartbeat('job-1', T0 + 4 * 60_000);

    expect(monitor.check(T0 + FIVE_MINUTES)).toEqual([]);
    expect(monitor.check(T0 + FIVE_MINUTES + 61_000)).toHaveLength(1);
  });

  it('lists multiple stuck jobs oldest first', () => {
    const monitor = new AnalysisQueueMonitor({ stuckThresholdMs: 60_000 });
    monitor.register('job-new', T0);
    monitor.register('job-old', T0 - 120_000);
    monitor.heartbeat('job-new', T0 + 30_000);

    const stuck = monitor.check(T0 + 120_000);

    expect(stuck.map((job) => job.id)).toEqual(['job-old', 'job-new']);
  });

  it('alerts once per job and not again on repeat checks', () => {
    const onAlert = vi.fn();
    const monitor = new AnalysisQueueMonitor({ stuckThresholdMs: 60_000, onAlert });
    monitor.register('job-1', T0);

    monitor.check(T0 + 61_000);
    monitor.check(T0 + 120_000);

    expect(onAlert).toHaveBeenCalledTimes(1);
    expect(onAlert).toHaveBeenCalledWith([expect.objectContaining({ id: 'job-1' })]);
  });

  it('alerts again for a different job in the same check', () => {
    const onAlert = vi.fn();
    const monitor = new AnalysisQueueMonitor({ stuckThresholdMs: 60_000, onAlert });
    monitor.register('job-1', T0 - 120_000);
    monitor.register('job-2', T0 - 120_000);

    monitor.check(T0);
    monitor.check(T0 + 61_000);

    expect(onAlert).toHaveBeenCalledTimes(2);
  });

  it('allows a completed job id to be re-registered and alerted again', () => {
    const onAlert = vi.fn();
    const monitor = new AnalysisQueueMonitor({ stuckThresholdMs: 60_000, onAlert });
    monitor.register('job-1', T0);
    monitor.check(T0 + 61_000);

    monitor.complete('job-1');
    monitor.register('job-1', T0 + 120_000);
    monitor.check(T0 + 240_000);

    expect(onAlert).toHaveBeenCalledTimes(2);
  });

  it('ignores heartbeats and completions for unknown jobs', () => {
    const monitor = new AnalysisQueueMonitor();

    expect(() => {
      monitor.heartbeat('missing', T0);
      monitor.complete('missing');
    }).not.toThrow();
  });

  it('rejects duplicate registrations', () => {
    const monitor = new AnalysisQueueMonitor();
    monitor.register('job-1', T0);

    expect(() => monitor.register('job-1', T0)).toThrow('already registered');
  });

  it('uses a 5 minute default threshold and injectable clock', () => {
    const monitor = new AnalysisQueueMonitor();
    monitor.register('job-1', T0);

    const stuck: StuckAnalysisJob[] = monitor.check(T0 + 5 * 60_000 + 1);

    expect(stuck).toHaveLength(1);
  });
});
