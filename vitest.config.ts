import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// #152: coverage thresholds. Global bar is deliberately modest (this repo
// had zero tests before this change) — the CI failure on unmet thresholds
// is the point: it forces coverage to only ever go up as tests are added,
// rather than silently regressing.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Keep Playwright end-to-end specs (`tests/e2e`) out of the vitest run.
    // vitest's default include would match `tests/**/*.spec.ts` and try to
    // execute Playwright specs, which OOMs the worker and breaks coverage.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/*.config.*',
      'tests/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // `include` makes v8 report on every matching file, tested or not
      // (not just files a test happened to import) — a repo with 2 tested
      // files and 0% coverage everywhere else would otherwise show 100%.
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
      ],
      exclude: [
        'node_modules/**',
        '.next/**',
        'stories/**',
        '**/*.stories.tsx',
        '**/*.d.ts',
        '**/*.config.*',
        'components.json',
        '**/types/**',
        '**/*.types.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        // Per-directory override: hooks/ carry more business logic per line
        // (data fetching, memoized derivations) than average UI code, so
        // they're held to a higher bar.
        'hooks/**': {
          statements: 80,
        },
      },
    },
  },
});
