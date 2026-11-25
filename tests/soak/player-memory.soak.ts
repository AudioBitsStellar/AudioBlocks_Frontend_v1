/**
 * Long-session player soak test for memory leaks (#817).
 *
 * Plays the real playback harness (HLS decks, real media elements and local
 * fixtures, no network) for SOAK_DURATION_MS. Each cycle restarts playback and
 * moves to the next track, which exercises the same load, promote and teardown
 * paths as a listening session. At each sample interval the test forces a
 * garbage collection and records the JS heap, DOM node count and JS event
 * listeners. After a warm-up period it fits a line to the heap samples. The run
 * fails when the heap grows faster than SOAK_MAX_SLOPE_MB_PER_HOUR.
 *
 * Limits: this measures the JS heap, DOM and listeners. Decoded media buffers
 * live outside the JS heap, and the harness does not exercise the Web Audio
 * `AudioBuffer` cache, so a leak only in those paths will not show here. See
 * docs/SOAK_TESTING.md.
 *
 * Environment (all optional):
 *   SOAK_DURATION_MS            total run time            (default 4 hours)
 *   SOAK_SAMPLE_INTERVAL_MS     time between samples      (default 60 s)
 *   SOAK_WARMUP_MS              samples before this is excluded (default 10 min,
 *                               capped at a quarter of the run)
 *   SOAK_MAX_SLOPE_MB_PER_HOUR  allowed heap growth after warm-up (default 10)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type CDPSession, type Page, type TestInfo } from '@playwright/test';

const FIXTURE_DIR = path.resolve('tests/fixtures/hls');
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const MB = 1024 * 1024;
const MIN_STEADY_SAMPLES = 3;

function readPositiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number, got "${raw}"`);
  }
  return value;
}

const DURATION_MS = readPositiveNumber('SOAK_DURATION_MS', 4 * HOUR_MS);
const SAMPLE_INTERVAL_MS = readPositiveNumber('SOAK_SAMPLE_INTERVAL_MS', MINUTE_MS);
const WARMUP_MS = Math.min(readPositiveNumber('SOAK_WARMUP_MS', 10 * MINUTE_MS), DURATION_MS / 4);
const MAX_SLOPE_MB_PER_HOUR = readPositiveNumber('SOAK_MAX_SLOPE_MB_PER_HOUR', 10);

interface MemorySample {
  elapsedMs: number;
  cycles: number;
  heapUsedMB: number;
  heapTotalMB: number;
  domNodes: number;
  jsEventListeners: number;
}

interface MemoryReport {
  durationMs: number;
  sampleIntervalMs: number;
  warmupMs: number;
  cycles: number;
  maxSlopeMBPerHour: number;
  /** Least-squares heap growth after warm-up, or null when there are too few samples. */
  slopeMBPerHour: number | null;
  verdict: 'pass' | 'fail' | 'insufficient-samples';
  steady: { firstMB: number; peakMB: number; finalMB: number; growthPercent: number } | null;
  samples: MemorySample[];
}

/** Serves the harness's HLS fixtures locally, as the queued-HLS playback test does. */
async function routeFixtures(page: Page): Promise<void> {
  await page.route('**/api/song/stream/*', async (route) => {
    const id = route.request().url().split('/').pop() ?? 'one';
    const body = (await readFile(path.join(FIXTURE_DIR, 'tone.m3u8'), 'utf8')).replace(
      /tone-(\d+)\.bin/g,
      `/fixtures/hls/${id}/tone-$1.bin`
    );
    await route.fulfill({ contentType: 'application/vnd.apple.mpegurl', body });
  });
  await page.route('**/fixtures/hls/*/*.bin', async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      contentType: 'video/mp2t',
      body: await readFile(path.join(FIXTURE_DIR, path.basename(url.pathname))),
    });
  });
  await page.route('**/fixture/plays/*', (route) => route.fulfill({ json: { ok: true } }));
}

/** Current time of whichever deck is playing, or 0 while neither is. */
function playingDeckTime(page: Page): Promise<number> {
  return page.evaluate(() => {
    const decks = [...document.querySelectorAll<HTMLAudioElement>('[data-testid^="deck-"]')];
    return decks.find((deck) => !deck.paused)?.currentTime ?? 0;
  });
}

/** One listening cycle: restart playback on track one, then advance to track two. */
async function playOneCycle(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(() => playingDeckTime(page), { timeout: 30_000 }).toBeGreaterThan(0.1);

  // Jump the playing deck close to its end, which triggers the queued transition.
  await page.evaluate(() => {
    const decks = [...document.querySelectorAll<HTMLAudioElement>('[data-testid^="deck-"]')];
    const playing = decks.find((deck) => !deck.paused);
    if (playing) playing.currentTime = playing.duration - 0.4;
  });
  await expect(page.getByTestId('track')).toHaveText('two', { timeout: 30_000 });
}

async function takeSample(
  page: Page,
  cdp: CDPSession,
  startedAt: number,
  cycles: number
): Promise<MemorySample> {
  // Collect garbage first, so the heap figure counts live objects only.
  await cdp.send('HeapProfiler.collectGarbage');
  const heap = (await cdp.send('Runtime.getHeapUsage')) as { usedSize: number; totalSize: number };
  const { metrics } = (await cdp.send('Performance.getMetrics')) as {
    metrics: Array<{ name: string; value: number }>;
  };
  const listeners = metrics.find((metric) => metric.name === 'JSEventListeners')?.value ?? 0;
  const domNodes = await page.evaluate(() => document.getElementsByTagName('*').length);

  return {
    elapsedMs: Date.now() - startedAt,
    cycles,
    heapUsedMB: heap.usedSize / MB,
    heapTotalMB: heap.totalSize / MB,
    domNodes,
    jsEventListeners: listeners,
  };
}

/** Least-squares slope of y against x. */
function linearSlope(points: Array<{ x: number; y: number }>): number {
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  let numerator = 0;
  let denominator = 0;
  for (const p of points) {
    numerator += (p.x - meanX) * (p.y - meanY);
    denominator += (p.x - meanX) ** 2;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

function buildReport(samples: MemorySample[], cycles: number): MemoryReport {
  const steadySamples = samples.filter((sample) => sample.elapsedMs >= WARMUP_MS);
  const base = {
    durationMs: DURATION_MS,
    sampleIntervalMs: SAMPLE_INTERVAL_MS,
    warmupMs: WARMUP_MS,
    cycles,
    maxSlopeMBPerHour: MAX_SLOPE_MB_PER_HOUR,
    samples,
  };

  if (steadySamples.length < MIN_STEADY_SAMPLES) {
    return { ...base, slopeMBPerHour: null, verdict: 'insufficient-samples', steady: null };
  }

  const slopePerMs = linearSlope(
    steadySamples.map((sample) => ({ x: sample.elapsedMs, y: sample.heapUsedMB }))
  );
  const slopeMBPerHour = slopePerMs * HOUR_MS;
  const firstMB = steadySamples[0].heapUsedMB;
  const finalMB = steadySamples[steadySamples.length - 1].heapUsedMB;
  const peakMB = Math.max(...steadySamples.map((sample) => sample.heapUsedMB));

  return {
    ...base,
    slopeMBPerHour,
    verdict: slopeMBPerHour <= MAX_SLOPE_MB_PER_HOUR ? 'pass' : 'fail',
    steady: {
      firstMB,
      peakMB,
      finalMB,
      growthPercent: ((finalMB - firstMB) / firstMB) * 100,
    },
  };
}

function renderMarkdown(report: MemoryReport): string {
  const minutes = (ms: number) => (ms / MINUTE_MS).toFixed(1);
  const header = [
    '# Player soak memory report (#817)',
    '',
    `- Verdict: **${report.verdict}**`,
    `- Run: ${minutes(report.durationMs)} min, warm-up excluded: ${minutes(report.warmupMs)} min`,
    `- Playback cycles: ${report.cycles}`,
    `- Heap growth after warm-up: ${report.slopeMBPerHour?.toFixed(2) ?? 'n/a'} MB/hour (limit ${report.maxSlopeMBPerHour} MB/hour)`,
  ];
  if (report.steady) {
    header.push(
      `- Heap after warm-up (after GC): first ${report.steady.firstMB.toFixed(2)} MB, peak ${report.steady.peakMB.toFixed(2)} MB, final ${report.steady.finalMB.toFixed(2)} MB (${report.steady.growthPercent.toFixed(1)}%)`
    );
  }
  const table = [
    '',
    '| Elapsed (min) | Cycles | Heap used (MB, after GC) | DOM nodes | JS event listeners |',
    '| ---: | ---: | ---: | ---: | ---: |',
    ...report.samples.map(
      (s) =>
        `| ${minutes(s.elapsedMs)} | ${s.cycles} | ${s.heapUsedMB.toFixed(2)} | ${s.domNodes} | ${s.jsEventListeners} |`
    ),
    '',
  ];
  return [...header, ...table].join('\n');
}

async function writeReport(testInfo: TestInfo, report: MemoryReport): Promise<void> {
  await mkdir(testInfo.outputDir, { recursive: true });
  const jsonPath = testInfo.outputPath('memory-report.json');
  const markdownPath = testInfo.outputPath('memory-report.md');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, `${renderMarkdown(report)}\n`);
  await testInfo.attach('memory-report', { path: markdownPath, contentType: 'text/markdown' });
  console.log(`Soak memory report written to ${markdownPath}`);
}

test.describe('Player memory soak (#817)', () => {
  test('playback heap stays flat over a long session', async ({ page }, testInfo) => {
    test.setTimeout(DURATION_MS + 20 * MINUTE_MS);

    await routeFixtures(page);
    await page.goto('/tests/playback-harness/');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');

    const startedAt = Date.now();
    const samples: MemorySample[] = [await takeSample(page, cdp, startedAt, 0)];
    let nextSampleAt = startedAt + SAMPLE_INTERVAL_MS;
    let cycles = 0;

    while (Date.now() - startedAt < DURATION_MS) {
      await playOneCycle(page);
      cycles += 1;
      if (Date.now() >= nextSampleAt) {
        samples.push(await takeSample(page, cdp, startedAt, cycles));
        nextSampleAt += SAMPLE_INTERVAL_MS;
      }
    }
    samples.push(await takeSample(page, cdp, startedAt, cycles));

    const report = buildReport(samples, cycles);
    await writeReport(testInfo, report);

    expect(
      report.verdict,
      `only ${samples.length} samples: lengthen SOAK_DURATION_MS or shorten SOAK_SAMPLE_INTERVAL_MS`
    ).not.toBe('insufficient-samples');
    expect(
      report.slopeMBPerHour ?? 0,
      `JS heap grows ${report.slopeMBPerHour?.toFixed(2)} MB/hour after warm-up (limit ${MAX_SLOPE_MB_PER_HOUR})`
    ).toBeLessThanOrEqual(MAX_SLOPE_MB_PER_HOUR);
  });
});
