import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'queued-hls.spec.ts',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: ['--autoplay-policy=no-user-gesture-required'],
    },
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --config vite.playback.config.ts',
    url: 'http://127.0.0.1:3100/tests/playback-harness/',
    reuseExistingServer: !process.env.CI,
  },
});
