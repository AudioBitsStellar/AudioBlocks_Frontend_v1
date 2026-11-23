# Soak Testing Guide

## Overview

Soak tests (#817) run extended player sessions to detect memory leaks and performance degradation over time. These tests are separate from the regular unit test suite.

## Player Memory Leak Soak Test

### Quick Test (1 minute)

```bash
npm run test -- tests/soak/player-memory-leak.soak.ts
```

### Full 4-Hour Soak Test

```bash
SOAK_DURATION_MS=14400000 npm run test -- tests/soak/player-memory-leak.soak.ts --run
```

### Environment Variables

- `SOAK_DURATION_MS` - Duration in milliseconds (default: 60000 = 1 minute)
  - For 4 hours: `14400000`
  - For 1 hour: `3600000`

## Interpreting Results

The test reports:

- **Baseline**: Initial memory usage
- **Peak**: Maximum memory used during test
- **Final**: Memory after test completes
- **Growth %**: Overall memory growth percentage

### Guidelines

- ✅ **Acceptable**: Memory grows <20% during test, then stabilizes
- ⚠️ **Concerning**: Memory grows 20-50%, may indicate minor leaks
- ❌ **Failure**: Memory grows >50%, likely leak in Web Audio handling

## Running on CI

Add a separate GitHub Actions workflow for soak tests that runs on schedule (not on every PR):

```yaml
name: soak-tests
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly at 2 AM UTC
  workflow_dispatch:

jobs:
  soak:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci --legacy-peer-deps
      - run: SOAK_DURATION_MS=14400000 npm run test -- tests/soak/player-memory-leak.soak.ts --run
```

## Debugging Memory Leaks

If a leak is detected:

1. Check AudioBuffer creation/disposal in `lib/player/audioGraph.ts`
2. Verify Web Audio contexts are properly closed
3. Look for event listeners that aren't cleaned up
4. Check cache TTLs in `queryClient.ts` - stale data can hold memory

Use Chrome DevTools during test to profile:

```javascript
// In console while soak test runs
performance.memory
// Watch usedJSHeapSize growth over time
```
