# Player soak testing

`tests/soak/player-memory.soak.ts` runs the player for a long session and checks that its JS heap does not keep growing (#817). It drives the same playback harness as the queued-HLS test, with local HLS fixtures and no network. The run writes a memory report.

## Running it

The workflow `.github/workflows/soak.yml` runs the full 4-hour soak on demand (**Actions → player-soak → Run workflow**) and every Sunday at 02:00 UTC. It uploads `player-soak-memory-report` with `memory-report.md` and `memory-report.json`.

To run it locally, for example as a 2-minute smoke check:

```bash
SOAK_DURATION_MS=120000 SOAK_SAMPLE_INTERVAL_MS=30000 SOAK_WARMUP_MS=10000 npm run test:soak
```

The report is written under `test-results/soak/`.

| Variable | Default | Meaning |
|----------|---------|---------|
| `SOAK_DURATION_MS` | `14400000` (4 h) | Total run length |
| `SOAK_SAMPLE_INTERVAL_MS` | `60000` | Time between heap samples |
| `SOAK_WARMUP_MS` | `600000` (10 min), capped at a quarter of the run | Early samples left out of the trend, so cache warm-up does not count as a leak |
| `SOAK_MAX_SLOPE_MB_PER_HOUR` | `10` | Largest allowed heap growth after warm-up |

## What is measured

Each sample forces a garbage collection, then reads from Chromium over CDP:

- **JS heap used** (`Runtime.getHeapUsage`): the main signal. A line is fitted to the post-warm-up samples, and its slope in MB per hour is compared with the limit.
- **DOM node count** and **JS event listeners** (`Performance.getMetrics`): these show leaked components or subscriptions, which often leak before the heap does.

The report has a verdict of `pass`, `fail` or `insufficient-samples`. The last means fewer than three samples remained after warm-up, so lengthen the run or sample more often.

## Limits

- The JS heap does not include decoded media buffers, which live in native memory. Media-buffer leaks need a process-level measurement, which this test does not do.
- The harness does not exercise the Web Audio `AudioBuffer` cache (`useAudioBuffer`). A leak confined to that path will not show up here yet. Covering it means adding a harness page that uses that hook.
- `SOAK_MAX_SLOPE_MB_PER_HOUR = 10` is a starting point, not a measured bound. Set it from the first few real 4-hour reports.
- Chromium only, because the test uses CDP.
