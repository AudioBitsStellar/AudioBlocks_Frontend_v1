import '@testing-library/jest-dom/vitest';

Object.defineProperty(global.window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  get() {
    return () => Promise.resolve();
  },
});

Object.defineProperty(global.window.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  get() {
    return () => {};
  },
});

process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_RPC_URL = 'http://localhost:8545';
process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID = 'test-env-id';
