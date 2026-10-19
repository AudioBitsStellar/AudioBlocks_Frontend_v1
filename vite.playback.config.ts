import path from 'node:path';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'next/link': path.resolve(__dirname, 'tests/playback-harness/Link.tsx'),
    },
  },
  define: {
    'process.env.NEXT_PUBLIC_API_URL': JSON.stringify('http://127.0.0.1:3100'),
    'process.env.NEXT_PUBLIC_STREAM_PLAY_COUNT_MODE': JSON.stringify('event'),
    'process.env.NEXT_PUBLIC_PLAYBACK_EVENT_URL': JSON.stringify('/fixture/plays/:id'),
  },
  server: { hmr: false, host: '127.0.0.1', port: 3100, strictPort: true },
});
