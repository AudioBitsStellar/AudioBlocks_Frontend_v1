/**
 * Async job queue for quality analysis (#411).
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA) initiative.
 * `processUploadQualityCheck` (lib/uploadQualityPipeline.ts) and
 * `AnalysisQueueMonitor` (lib/analysisQueueMonitor.ts) were both already
 * built and tested, but neither was ever wired to an actual dispatch
 * mechanism a client could call — there was no code path that accepted a
 * request and ran the pipeline asynchronously rather than blocking the
 * caller. `lib/qualityLoadTest.ts`'s own doc comment already assumes "the
 * quality endpoint" exists to fire requests at; this is that endpoint's
 * backing queue.
 *
 * This is an in-process, in-memory queue: a bounded worker pool pulls jobs
 * and awaits `processUploadQualityCheck`, so a burst of uploads is capped at
 * `concurrency` simultaneous NVIDIA API calls instead of firing them all at
 * once. Every job is registered with an `AnalysisQueueMonitor` for
 * heartbeat/stuck-job tracking, matching the monitor's own documented
 * composition model.
 *
 * Scope note: because job state lives in a plain in-memory Map, this only
 * works correctly on a long-lived Node process — not across independent
 * serverless invocations, which may not share memory or may recycle between
 * the enqueue call and a later status poll. That's an explicit, deliberate
 * scope boundary for this implementation, not an oversight: AnalysisQueueMonitor's
 * own doc comment anticipates swapping in "any backend queue (e.g. BullMQ)"
 * later, and this queue's `processFn` is injectable specifically so the
 * in-memory dispatch loop here can be replaced by a real backend-queue-backed
 * one without changing the API route contract in front of it.
 */

import { randomUUID } from 'node:crypto';
import { AnalysisQueueMonitor } from './analysisQueueMonitor';
import {
  processUploadQualityCheck,
  type UploadQualityPipelineInput,
  type UploadQualityPipelineOptions,
  type UploadQualityPipelineResult,
} from './uploadQualityPipeline';

export type QualityAnalysisJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface QualityAnalysisJob {
  id: string;
  status: QualityAnalysisJobStatus;
  trackId: string;
  enqueuedAt: number;
  startedAt?: number;
  finishedAt?: number;
  result?: UploadQualityPipelineResult;
  error?: string;
}

export type QualityAnalysisProcessFn = (
  input: UploadQualityPipelineInput,
  options: UploadQualityPipelineOptions
) => Promise<UploadQualityPipelineResult>;

export interface QualityAnalysisJobQueueOptions {
  /** Maximum number of jobs processed simultaneously. Defaults to 3. */
  concurrency?: number;
  /** Shared monitor jobs are registered with. A fresh one is created if omitted. */
  queueMonitor?: AnalysisQueueMonitor;
  /** Injectable so tests don't need a real NVIDIA call; defaults to processUploadQualityCheck. */
  processFn?: QualityAnalysisProcessFn;
  /** Injectable id generator for deterministic tests; defaults to crypto.randomUUID. */
  idFn?: () => string;
  /** Injectable clock for deterministic tests; defaults to Date.now. */
  now?: () => number;
}

const DEFAULT_CONCURRENCY = 3;

/**
 * A bounded-concurrency, in-memory async job queue for the quality analysis
 * pipeline. Call `enqueue` to submit a job and get an id back immediately;
 * poll `getJob(id)` for its status and, once `completed`/`failed`, its
 * result or error.
 */
interface PendingWork {
  input: UploadQualityPipelineInput;
  options: UploadQualityPipelineOptions;
}

export class QualityAnalysisJobQueue {
  private readonly jobs = new Map<string, QualityAnalysisJob>();
  private readonly pending: string[] = [];
  private readonly work = new Map<string, PendingWork>();
  private readonly concurrency: number;
  private readonly queueMonitor: AnalysisQueueMonitor;
  private readonly processFn: QualityAnalysisProcessFn;
  private readonly idFn: () => string;
  private readonly now: () => number;
  private inFlight = 0;

  constructor(options: QualityAnalysisJobQueueOptions = {}) {
    this.concurrency =
      options.concurrency && options.concurrency > 0 ? options.concurrency : DEFAULT_CONCURRENCY;
    this.queueMonitor = options.queueMonitor ?? new AnalysisQueueMonitor();
    this.processFn = options.processFn ?? processUploadQualityCheck;
    this.idFn = options.idFn ?? (() => randomUUID());
    this.now = options.now ?? (() => Date.now());
  }

  /** Number of jobs waiting for a free worker slot (not yet started). */
  get queueLength(): number {
    return this.pending.length;
  }

  /** Number of jobs currently being processed. */
  get activeCount(): number {
    return this.inFlight;
  }

  /**
   * Submits a job and returns its id immediately without waiting for
   * analysis to finish. The job starts processing right away if a worker
   * slot is free, otherwise it waits in FIFO order.
   */
  enqueue(
    input: UploadQualityPipelineInput,
    pipelineOptions: UploadQualityPipelineOptions = {}
  ): string {
    const id = this.idFn();
    this.jobs.set(id, {
      id,
      status: 'queued',
      trackId: input.trackId,
      enqueuedAt: this.now(),
    });
    this.work.set(id, { input, options: pipelineOptions });
    this.pending.push(id);
    this.drain();
    return id;
  }

  getJob(id: string): QualityAnalysisJob | undefined {
    return this.jobs.get(id);
  }

  /** Snapshot of every job the queue currently knows about, oldest first. */
  listJobs(): QualityAnalysisJob[] {
    return [...this.jobs.values()].sort((a, b) => a.enqueuedAt - b.enqueuedAt);
  }

  private drain(): void {
    while (this.inFlight < this.concurrency && this.pending.length > 0) {
      const id = this.pending.shift();
      if (id === undefined) break;
      void this.run(id);
    }
  }

  private async run(id: string): Promise<void> {
    const job = this.jobs.get(id);
    const work = this.work.get(id);
    if (!job || !work) return;

    this.inFlight += 1;
    job.status = 'processing';
    job.startedAt = this.now();
    this.queueMonitor.register(id, job.startedAt);

    try {
      const result = await this.processFn(work.input, {
        ...work.options,
        queueMonitor: this.queueMonitor,
      });
      job.status = 'completed';
      job.result = result;
    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
    } finally {
      job.finishedAt = this.now();
      this.queueMonitor.complete(id);
      this.work.delete(id);
      this.inFlight -= 1;
      this.drain();
    }
  }
}

/**
 * Process-wide singleton so the enqueue route and the status-poll route
 * share the same in-memory job state. See the scope note in this file's
 * header: this only holds up on a single, long-lived Node process.
 */
export const qualityAnalysisJobQueue = new QualityAnalysisJobQueue();
