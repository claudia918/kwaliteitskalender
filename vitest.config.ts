import { defineConfig } from 'vitest/config';

// Los van vite.config.ts: de tests hebben de single-file-build niet nodig.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
