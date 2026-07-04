export const API_URL = 'http://localhost:3001/api';
export const MOCK_SUPABASE_PORT = 54331;

export const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e@atlaslineage.test';
export const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'Test-Password-123!';

export const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://atlas:atlas_dev_password@localhost:5432/atlas_lineage';

// True when real Supabase project credentials were supplied via env instead
// of relying on the local mock-supabase-server.js stand-in.
export const useRealSupabase = Boolean(process.env.SUPABASE_URL);
