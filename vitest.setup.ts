import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

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

// Node 25+ ships a global `localStorage` that is unusable without
// `--localstorage-file` and shadows jsdom's; swap in an in-memory Storage.
if (typeof window.localStorage?.clear !== 'function') {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_RPC_URL = 'http://localhost:8545';
process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID = 'test-env-id';
// Tests rely on the demo fixtures (default playlist, listings); production leaves this unset.
process.env.NEXT_PUBLIC_USE_DEMO_DATA = 'true';

// #603: API calls in unit tests are answered by the shared MSW handlers.
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
