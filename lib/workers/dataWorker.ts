/**
 * Data Processing Web Worker (#111)
 *
 * Handles background data processing: sorting, filtering, waveform computation.
 */

interface WorkerMessage {
  id: string;
  type: "sort" | "filter" | "waveform";
  payload: unknown;
}

interface WorkerResponse {
  id: string;
  type: "result" | "error";
  data?: unknown;
  error?: string;
}

// Sort data by key
function sortData(data: Record<string, unknown>[], key: string, direction: "asc" | "desc") {
  return [...data].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    return direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });
}

// Filter data by search query
function filterData(data: Record<string, unknown>[], query: string, fields: string[]) {
  const lowerQuery = query.toLowerCase();
  return data.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      return value !== undefined && value !== null && String(value).toLowerCase().includes(lowerQuery);
    })
  );
}

// Compute waveform peaks from audio buffer data
function computeWaveform(audioData: Float32Array, bucketCount: number = 200): number[] {
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

// Message handler
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = e.data;

  try {
    let result: unknown;

    switch (type) {
      case "sort": {
        const { data, key, direction } = payload as {
          data: Record<string, unknown>[];
          key: string;
          direction: "asc" | "desc";
        };
        result = sortData(data, key, direction);
        break;
      }
      case "filter": {
        const { data, query, fields } = payload as {
          data: Record<string, unknown>[];
          query: string;
          fields: string[];
        };
        result = filterData(data, query, fields);
        break;
      }
      case "waveform": {
        const { audioData, bucketCount } = payload as {
          audioData: Float32Array;
          bucketCount?: number;
        };
        result = computeWaveform(audioData, bucketCount);
        break;
      }
      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    const response: WorkerResponse = {
      id,
      type: "result",
      data: result,
    };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      id,
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    self.postMessage(response);
  }
};
