/**
 * Queue monitoring and alerting for stuck analysis jobs (#451).
 *
 * The AI Song Quality Filter analyzes uploads asynchronously. A crashed
 * worker, a wedged HTTP call, or a lost message leaves a job "in flight"
 * forever, blocking the queue and delaying every upload behind it. This
 * monitor tracks job heartbeats and surfaces the jobs that stopped sending
 * them, so operators (or an alerting integration) can requeue or investigate.
 *
 * The monitor is storage-agnostic: jobs are registered by id and their state
 * is kept in memory, so it composes with any backend queue (e.g. BullMQ)
 * whose worker loop calls `register`, `heartbeat`, and `complete`.
 */

export interface AnalysisJobRecord {
  id: string;
  startedAt: number;
  lastHeartbeatAt: number;
}

export interface StuckAnalysisJob {
  id: string;
  startedAt: number;
  lastHeartbeatAt: number;
  /** How long since the last heartbeat, in milliseconds. */
  stuckForMs: number;
}

/** Callback invoked with the jobs that became stuck since the last check. */
export type QueueAlertHandler = (stuck: StuckAnalysisJob[]) => void;

export interface AnalysisQueueMonitorOptions {
  /** Silence allowed before a job counts as stuck. Defaults to 5 minutes. */
  stuckThresholdMs?: number;
  /** Called by `check` for every newly stuck job batch. */
  onAlert?: QueueAlertHandler;
}

const DEFAULT_STUCK_THRESHOLD_MS = 5 * 60 * 1000;

/** Tracks analysis jobs and alerts when they stop making progress. */
export class AnalysisQueueMonitor {
  private readonly jobs = new Map<string, AnalysisJobRecord>();
  private readonly alerted = new Set<string>();
  private readonly stuckThresholdMs: number;
  private readonly onAlert?: QueueAlertHandler;

  constructor(options: AnalysisQueueMonitorOptions = {}) {
    this.stuckThresholdMs = options.stuckThresholdMs ?? DEFAULT_STUCK_THRESHOLD_MS;
    this.onAlert = options.onAlert;
  }

  /** Registers a job as in flight. Throws if the id is already tracked. */
  register(id: string, now: number = Date.now()): void {
    if (this.jobs.has(id)) {
      throw new Error(`Analysis job "${id}" is already registered`);
    }
    this.jobs.set(id, { id, startedAt: now, lastHeartbeatAt: now });
  }

  /** Records progress for a job. Unknown ids are ignored. */
  heartbeat(id: string, now: number = Date.now()): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.lastHeartbeatAt = now;
  }

  /** Removes a completed (or requeue- superseded) job and its alert state. */
  complete(id: string): void {
    this.jobs.delete(id);
    this.alerted.delete(id);
  }

  /**
   * Returns every job that has been silent for longer than the threshold,
   * oldest first, and fires `onAlert` once per newly stuck job so repeat
   * checks do not spam the same alert.
   */
  check(now: number = Date.now()): StuckAnalysisJob[] {
    const stuck: StuckAnalysisJob[] = [];
    for (const job of this.jobs.values()) {
      const stuckForMs = now - job.lastHeartbeatAt;
      if (stuckForMs > this.stuckThresholdMs) {
        stuck.push({
          id: job.id,
          startedAt: job.startedAt,
          lastHeartbeatAt: job.lastHeartbeatAt,
          stuckForMs,
        });
      }
    }
    stuck.sort((a, b) => a.lastHeartbeatAt - b.lastHeartbeatAt);

    const newlyStuck = stuck.filter((job) => !this.alerted.has(job.id));
    for (const job of newlyStuck) {
      this.alerted.add(job.id);
    }
    if (newlyStuck.length > 0) {
      this.onAlert?.(newlyStuck);
    }

    return stuck;
  }
}
