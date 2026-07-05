// Config for the prod smoke suite (tests/prod, playwright.prod.config.ts).
// This suite drives the already-deployed production build at PROD_URL
// directly, over the real network — no local servers are started.
//
// Auth (/api/auth/*) and /api/trees hit the real prod API, so you need a
// real e2e test account already provisioned in prod Supabase/Postgres with
// a tree claimed (see claimDefaultTree in packages/db/src/queries/trees.ts).
// Only /api/persons and /api/relationships are intercepted — see
// tests/prod/mock-data-api.ts — so the suite can freely create/edit/delete
// people and relationships without ever touching real production data.
export const PROD_URL = process.env.PROD_URL ?? 'https://atlas-lineage.vercel.app';

export const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL;
export const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;
