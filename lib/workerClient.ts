export type {
  WorkerTask,
  WorkerResponse,
} from '@/lib/workers/dataWorker';

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

const IDLE_TIMEOUT = 30_000;

let workerInstance: Worker | null = null;
let requestId = 0;
const pending = new Map<number, PendingRequest>();
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function clearIdleTimer() {
  if (idleTimer !== null) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function setIdleTimer() {
  clearIdleTimer();
  if (pending.size === 0) {
    idleTimer = setTimeout(() => {
      terminateWorker();
    }, IDLE_TIMEOUT);
  }
}

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (workerInstance) return workerInstance;
  try {
    workerInstance = new Worker(
      new URL('@/lib/workers/dataWorker', import.meta.url),
      { type: 'module' }
    );
    workerInstance.onmessage = (e: MessageEvent) => {
      const { id, response } = e.data as { id?: number; response: unknown };
      if (id !== undefined) {
        const req = pending.get(id);
        if (req) {
          clearIdleTimer();
          pending.delete(id);
          req.resolve(response);
          setIdleTimer();
        }
      }
    };
    workerInstance.onerror = (err) => {
      for (const [id, req] of pending) {
        clearIdleTimer();
        pending.delete(id);
        req.reject(new Error(err.message || 'Worker error'));
      }
    };
    return workerInstance;
  } catch {
    workerInstance = null;
    return null;
  }
}

function terminateWorker() {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
}

function sendToWorker<T>(task: import('@/lib/workers/dataWorker').WorkerTask): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('Worker request timed out'));
    }, 10_000);

    const worker = getWorker();

    if (!worker) {
      clearTimeout(timer);
      fallbackExecute<T>(task).then(resolve).catch(reject);
      return;
    }

    pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
    worker.postMessage({ id, ...task });
  });
}

function fallbackExecute<T>(task: import('@/lib/workers/dataWorker').WorkerTask): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      let result: unknown;
      switch (task.type) {
        case 'sort': {
          const sorted = [...task.data].sort((a: unknown, b: unknown) => {
            const aVal = (a as Record<string, unknown>)[task.key];
            const bVal = (b as Record<string, unknown>)[task.key];
            if (aVal < bVal) return task.order === 'asc' ? -1 : 1;
            if (aVal > bVal) return task.order === 'asc' ? 1 : -1;
            return 0;
          });
          result = sorted;
          break;
        }
        case 'filter': {
          const lower = task.query.toLowerCase();
          result = task.data.filter((item: unknown) => {
            const record = item as Record<string, unknown>;
            return task.fields.some((field) => {
              const val = record[field];
              return typeof val === 'string' && val.toLowerCase().includes(lower);
            });
          });
          break;
        }
        case 'waveform': {
          const count = Math.max(64, Math.min(4096, task.samples));
          if (task.peaks && task.peaks.length > 0) {
            const out: number[] = [];
            const step = Math.max(1, Math.floor(task.peaks.length / count));
            for (let i = 0; i < count; i++) {
              const start = i * step;
              const end = Math.min(start + step, task.peaks.length);
              let sum = 0;
              for (let j = start; j < end; j++) {
                sum += Math.abs(task.peaks[j]);
              }
              out.push(end > start ? sum / (end - start) : 0);
            }
            result = out;
          } else {
            const out: number[] = [];
            for (let i = 0; i < count; i++) {
              const t = (i / count) * task.duration;
              const val =
                0.3 +
                0.4 * Math.abs(Math.sin(t * 2 * Math.PI * 3)) +
                0.3 * Math.abs(Math.cos(t * 2 * Math.PI * 7));
              out.push(Math.min(1, val));
            }
            result = out;
          }
          break;
        }
        case 'ping':
          result = 'pong';
          break;
      }
      resolve(result as T);
    } catch (err) {
      reject(err);
    }
  });
}

export const workerClient = {
  sort<T>(
    data: T[],
    key: keyof T,
    order?: 'asc' | 'desc'
  ): Promise<T[]> {
    return sendToWorker<T[]>({
      type: 'sort',
      data: data as unknown[],
      key: key as string,
      order,
    });
  },

  filter<T>(
    data: T[],
    query: string,
    fields: (keyof T)[]
  ): Promise<T[]> {
    return sendToWorker<T[]>({
      type: 'filter',
      data: data as unknown[],
      query,
      fields: fields as string[],
    });
  },

  computeWaveform(
    samples: number,
    duration: number,
    peaks?: number[]
  ): Promise<number[]> {
    return sendToWorker<number[]>({
      type: 'waveform',
      samples,
      duration,
      peaks,
    });
  },

  terminate(): void {
    terminateWorker();
  },
};
