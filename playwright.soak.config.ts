import { defineConfig } from '@playwright/test';

// Long-session soak runs (#817). They use the playback harness served by
// vite.playback.config.ts, the same setup as the queued-HLS playback test, so
// no production build is needed. See docs/SOAK_TESTING.md.
export default defineConfig({
  testDir: './tests/soak',
  testMatch: '**/*.soak.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results/soak',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'off',
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --config vite.playback.config.ts',
    url: 'http://127.0.0.1:3100/tests/playback-harness/',
    reuseExistingServer: !process.env.CI,
  },
});
