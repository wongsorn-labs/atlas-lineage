import { PROD_URL } from '../../prod.e2e.config';

// Vercel's API function bootstraps a full NestJS app per cold start (see
// vercel.json), and the first hit after idle time can take several seconds —
// long enough to blow through a test's default assertion timeout. Ping
// /api/health once before any test runs so that cold start is paid for here
// instead of mid-assertion in a real test.
export default async function globalSetup() {
  try {
    await fetch(`${PROD_URL}/api/health`, { signal: AbortSignal.timeout(30_000) });
  } catch {
    // Best-effort warm-up only. If the API is genuinely unreachable, the
    // actual tests will fail with a clearer error than this ping would.
  }
}
