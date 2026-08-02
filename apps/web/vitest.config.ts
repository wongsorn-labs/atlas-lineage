import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@wongsorn-labs/atlas-lineage-shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
