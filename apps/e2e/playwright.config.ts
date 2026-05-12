import { defineConfig } from '@playwright/test';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(__dirname, '../api/.env') });

const TEST_DB = resolve(__dirname, '../../atlas-lineage.test.db');

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5173',
  },
  workers: 1,
  globalSetup: './global-setup.ts',
  webServer: [
    {
      command: 'pnpm --filter @wongsorn-labs/atlas-lineage-api dev',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_PATH: TEST_DB,
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? '',
        PORT: '3001',
      },
    },
    {
      command: 'pnpm --filter @wongsorn-labs/atlas-lineage-web dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
