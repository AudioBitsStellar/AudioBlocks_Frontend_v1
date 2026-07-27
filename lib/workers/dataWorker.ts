export type WorkerTask =
  | { type: 'sort'; data: unknown[]; key: string; order?: 'asc' | 'desc' }
  | { type: 'filter'; data: unknown[]; query: string; fields: string[] }
  | { type: 'waveform'; samples: number; duration: number; peaks?: number[] }
  | { type: 'ping' };

export type WorkerResponse =
  | { type: 'sort'; result: unknown[] }
  | { type: 'filter'; result: unknown[] }
  | { type: 'waveform'; result: number[] }
  | { type: 'pong' }
  | { type: 'error'; message: string };

function sortTask(data: unknown[], key: string, order: 'asc' | 'desc'): unknown[] {
  const sorted = [...data].sort((a: unknown, b: unknown) => {
    const aVal = (a as Record<string, unknown>)[key];
    const bVal = (b as Record<string, unknown>)[key];
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
}

function filterTask(data: unknown[], query: string, fields: string[]): unknown[] {
  const lower = query.toLowerCase();
  return data.filter((item: unknown) => {
    const record = item as Record<string, unknown>;
    return fields.some((field) => {
      const val = record[field];
      return typeof val === 'string' && val.toLowerCase().includes(lower);
    });
  });
}

function waveformTask(
  samples: number,
  duration: number,
  peaks?: number[]
): number[] {
  const count = Math.max(64, Math.min(4096, samples));
  if (peaks && peaks.length > 0) {
    const result: number[] = [];
    const step = Math.max(1, Math.floor(peaks.length / count));
    for (let i = 0; i < count; i++) {
      const start = i * step;
      const end = Math.min(start + step, peaks.length);
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += Math.abs(peaks[j]);
      }
      result.push(end > start ? sum / (end - start) : 0);
    }
    return result;
  }
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * duration;
    const synthetic =
      0.3 +
      0.4 * Math.abs(Math.sin(t * 2 * Math.PI * 3)) +
      0.3 * Math.abs(Math.cos(t * 2 * Math.PI * 7));
    result.push(Math.min(1, synthetic));
  }
  return result;
}

self.onmessage = (e: MessageEvent<WorkerTask>) => {
  const task = e.data;
  try {
    switch (task.type) {
      case 'sort': {
        const result = sortTask(task.data, task.key, task.order ?? 'asc');
        self.postMessage({ type: 'sort', result } satisfies WorkerResponse);
        break;
      }
      case 'filter': {
        const result = filterTask(task.data, task.query, task.fields);
        self.postMessage({ type: 'filter', result } satisfies WorkerResponse);
        break;
      }
      case 'waveform': {
        const result = waveformTask(task.samples, task.duration, task.peaks);
        self.postMessage({ type: 'waveform', result } satisfies WorkerResponse);
        break;
      }
      case 'ping':
        self.postMessage({ type: 'pong' } satisfies WorkerResponse);
        break;
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown worker error',
    } satisfies WorkerResponse);
  }
};
