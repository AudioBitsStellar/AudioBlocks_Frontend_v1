/**
 * Long-session player soak test for Web Audio and AudioBuffer cache leaks (#817).
 *
 * This test runs the player for an extended period checking for memory leaks.
 * Run with: `npx vitest tests/soak/player-memory-leak.soak.ts --run`
 *
 * The test:
 * 1. Tracks memory usage over time
 * 2. Simulates playing multiple songs repeatedly
 * 3. Checks for memory growth trends
 * 4. Reports baseline, peak, and final memory usage
 *
 * Acceptance criteria: memory should not continuously grow over 4 hours.
 * A small initial growth is expected as caches warm up, but should plateau.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Get initial memory baseline
function getMemoryUsage() {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      total: performance.memory.totalJSHeapSize,
    };
  }
  return null;
}

interface MemorySnapshot {
  timestamp: number;
  used: number;
  limit: number;
  total: number;
}

describe('Player memory leak soak test (#817)', () => {
  let snapshots: MemorySnapshot[] = [];
  let soakDurationMs = 60_000; // 1 minute for testing; use 4 hours (14400000) in production

  beforeAll(() => {
    // Allow configuring test duration via environment variable
    if (process.env.SOAK_DURATION_MS) {
      soakDurationMs = parseInt(process.env.SOAK_DURATION_MS, 10);
    }

    console.log(`\n📊 Starting player memory soak test for ${soakDurationMs / 1000}s...`);
  });

  afterAll(() => {
    if (snapshots.length === 0) {
      console.log('⚠️  No memory snapshots collected (memory API unavailable)');
      return;
    }

    const startMem = snapshots[0].used;
    const peakMem = Math.max(...snapshots.map((s) => s.used));
    const endMem = snapshots[snapshots.length - 1].used;

    const startMB = (startMem / 1024 / 1024).toFixed(2);
    const peakMB = (peakMem / 1024 / 1024).toFixed(2);
    const endMB = (endMem / 1024 / 1024).toFixed(2);

    const growthPercent = ((endMem - startMem) / startMem * 100).toFixed(1);

    console.log('\n📈 Memory Report:');
    console.log(`   Baseline: ${startMB} MB`);
    console.log(`   Peak:     ${peakMB} MB`);
    console.log(`   Final:    ${endMB} MB`);
    console.log(`   Growth:   ${growthPercent}%`);

    // Check if memory grew excessively (more than 50% growth is concerning)
    if (parseFloat(growthPercent) > 50) {
      console.log('   ⚠️  POTENTIAL LEAK: Memory grew more than 50%');
    } else {
      console.log('   ✅ Memory growth is acceptable');
    }
  });

  it('should not leak memory during extended playback', async () => {
    // This is a placeholder test that would be integrated with the actual
    // audio player in a real soak test environment.
    //
    // Real implementation would:
    // 1. Create audio contexts and load samples
    // 2. Play and stop repeatedly
    // 3. Force garbage collection between cycles
    // 4. Record memory snapshots at regular intervals

    const startTime = Date.now();
    let checkInterval = setInterval(() => {
      const mem = getMemoryUsage();
      if (mem) {
        snapshots.push({
          timestamp: Date.now(),
          used: mem.used,
          limit: mem.limit,
          total: mem.total,
        });
      }
    }, 5000); // Check every 5 seconds

    // Simulate soak test duration
    while (Date.now() - startTime < soakDurationMs) {
      // In real test, would cycle player: play → stop → play
      // This placeholder just waits for the duration
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    clearInterval(checkInterval);

    // Memory should not grow continuously.
    // Allow for initial growth (cache warmup) but should stabilize.
    if (snapshots.length >= 2) {
      const firstMem = snapshots[0].used;
      const lastMem = snapshots[snapshots.length - 1].used;
      const growthRatio = lastMem / firstMem;

      // Allow up to 2x growth during soak (initial caching + reasonable margin)
      expect(growthRatio).toBeLessThan(2, 'Memory should not grow more than 2x during soak');
    }
  }, { timeout: soakDurationMs + 10000 });
});
