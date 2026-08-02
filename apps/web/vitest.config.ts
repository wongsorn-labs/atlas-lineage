import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  define: {
    __APP_COMMIT__: JSON.stringify('test'),
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
