import { defineConfig } from '@playwright/test';
import { PROD_URL } from './prod.e2e.config';

// Prod smoke suite: drives the already-deployed production build at
// PROD_URL over the real network. No webServer/globalSetup — there's
// nothing to start locally and no migrations to run. Auth and /api/trees
// hit the real API; /api/persons and /api/relationships are mocked per-test
// (see tests/prod/mock-data-api.ts) so the suite never touches real data.
export default defineConfig({
  testDir: './tests/prod',
  use: {
    baseURL: PROD_URL,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
  },
  workers: 1,
});
