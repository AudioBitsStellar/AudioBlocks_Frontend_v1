/**
 * Worker Client (#111)
 *
 * Promise-based message passing API for Web Workers.
 * Falls back to main thread if Worker is unavailable.
 */

type WorkerTaskType = "sort" | "filter" | "waveform";

interface WorkerTask {
  id: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

export class WorkerClient {
  private worker: Worker | null = null;
  private tasks: Map<string, WorkerTask> = new Map();
  private idleTimer: NodeJS.Timeout | null = null;
  private taskCounter = 0;

  private static IDLE_TIMEOUT_MS = 30000; // 30 seconds

  constructor() {
    if (typeof Worker !== "undefined") {
      this.initWorker();
    }
  }

  private initWorker(): void {
    try {
      this.worker = new Worker("/workers/dataWorker.js");
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
    } catch {
      console.warn("Web Worker not available, falling back to main thread");
      this.worker = null;
    }
  }

  private handleMessage(e: MessageEvent): void {
    const { id, type, data, error } = e.data;
    const task = this.tasks.get(id);

    if (!task) return;

    this.tasks.delete(id);

    if (type === "error") {
      task.reject(new Error(error));
    } else {
      task.resolve(data);
    }

    this.checkIdle();
  }

  private handleError(e: ErrorEvent): void {
    console.error("Worker error:", e);
    // Reject all pending tasks
    this.tasks.forEach((task) => {
      task.reject(new Error("Worker error"));
    });
    this.tasks.clear();
    this.worker = null;
  }

  private checkIdle(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    if (this.tasks.size === 0) {
      this.idleTimer = setTimeout(() => {
        this.terminate();
      }, WorkerClient.IDLE_TIMEOUT_MS);
    }
  }

  private generateId(): string {
    return `task_${++this.taskCounter}_${Date.now()}`;
  }

  /**
   * Execute a task in the worker
   */
  private async execute<T>(type: WorkerTaskType, payload: unknown): Promise<T> {
    // Fallback to main thread if worker unavailable
    if (!this.worker) {
      return this.executeOnMainThread(type, payload) as Promise<T>;
    }

    const id = this.generateId();

    return new Promise<T>((resolve, reject) => {
      this.tasks.set(id, {
        id,
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }

      this.worker!.postMessage({ id, type, payload });
    });
  }

  /**
   * Main thread fallback for environments without Worker support
   */
  private async executeOnMainThread(type: WorkerTaskType, payload: unknown): Promise<unknown> {
    switch (type) {
      case "sort": {
        const { data, key, direction } = payload as {
          data: Record<string, unknown>[];
          key: string;
          direction: "asc" | "desc";
        };
        return [...data].sort((a, b) => {
          const aVal = a[key];
          const bVal = b[key];
          if (typeof aVal === "number" && typeof bVal === "number") {
            return direction === "asc" ? aVal - bVal : bVal - aVal;
          }
          const aStr = String(aVal ?? "").toLowerCase();
          const bStr = String(bVal ?? "").toLowerCase();
          return direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
      }
      case "filter": {
        const { data, query, fields } = payload as {
          data: Record<string, unknown>[];
          query: string;
          fields: string[];
        };
        const lowerQuery = query.toLowerCase();
        return data.filter((item) =>
          fields.some((field) => {
            const value = item[field];
            return value !== undefined && value !== null && String(value).toLowerCase().includes(lowerQuery);
          })
        );
      }
      case "waveform": {
        const { audioData, bucketCount = 200 } = payload as {
          audioData: Float32Array;
          bucketCount?: number;
        };
        const bucketSize = Math.floor(audioData.length / bucketCount);
        const peaks: number[] = [];
        for (let i = 0; i < bucketCount; i++) {
          const start = i * bucketSize;
          const end = start + bucketSize;
          let max = 0;
          for (let j = start; j < end && j < audioData.length; j++) {
            const abs = Math.abs(audioData[j]);
            if (abs > max) max = abs;
          }
          peaks.push(max);
        }
        return peaks;
      }
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Sort data in the worker
   */
  sort<T>(data: T[], key: keyof T, direction: "asc" | "desc"): Promise<T[]> {
    return this.execute<T[]>("sort", { data, key, direction });
  }

  /**
   * Filter data in the worker
   */
  filter<T>(data: T[], query: string, fields: (keyof T)[]): Promise<T[]> {
    return this.execute<T[]>("filter", { data, query, fields });
  }

  /**
   * Compute waveform in the worker
   */
  computeWaveform(audioData: Float32Array, bucketCount?: number): Promise<number[]> {
    return this.execute<number[]>("waveform", { audioData, bucketCount });
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    // Reject all pending tasks
    this.tasks.forEach((task) => {
      task.reject(new Error("Worker terminated"));
    });
    this.tasks.clear();
  }

  /**
   * Check if worker is available
   */
  get isAvailable(): boolean {
    return this.worker !== null;
  }
}

// Singleton instance
let workerClientInstance: WorkerClient | null = null;

export function getWorkerClient(): WorkerClient {
  if (!workerClientInstance) {
    workerClientInstance = new WorkerClient();
  }
  return workerClientInstance;
}
