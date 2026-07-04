import { defineConfig } from '@playwright/test';
import { resolve } from 'path';
import * as dotenv from 'dotenv';
import { DATABASE_URL, E2E_TEST_EMAIL, E2E_TEST_PASSWORD, MOCK_SUPABASE_PORT, useRealSupabase } from './e2e.config';

dotenv.config({ path: resolve(__dirname, '../api/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL ?? `http://localhost:${MOCK_SUPABASE_PORT}`;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'e2e-mock-service-role-key';
const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? 'e2e-mock-anon-key';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5173',
    // Only set when a pinned Playwright browser build must be overridden
    // (e.g. a sandbox with a pre-installed Chromium at a fixed version).
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
  },
  workers: 1,
  globalSetup: './global-setup.ts',
  webServer: [
    // Stand-in for Supabase Auth so login/refresh/logout work offline in CI.
    // Skipped when SUPABASE_URL points at a real project (see e2e.config.ts).
    ...(useRealSupabase
      ? []
      : [
          {
            command: `node ${resolve(__dirname, 'mock-supabase-server.js')}`,
            url: `http://localhost:${MOCK_SUPABASE_PORT}/health`,
            reuseExistingServer: !process.env.CI,
            env: {
              PORT: String(MOCK_SUPABASE_PORT),
              E2E_TEST_EMAIL,
              E2E_TEST_PASSWORD,
            },
          },
        ]),
    {
      command: 'pnpm --filter @wongsorn-labs/atlas-lineage-api dev',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL,
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '0'.repeat(64),
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        PORT: '3001',
      },
    },
    {
      command: 'pnpm --filter @wongsorn-labs/atlas-lineage-web dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY,
      },
    },
  ],
});
