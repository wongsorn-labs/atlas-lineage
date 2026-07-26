## Why

The login page's "Sign in with Google" button calls `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '${origin}/auth/callback' })` (`apps/web/src/contexts/AuthContext.tsx`), but there is no `/auth/callback` route or handler anywhere in `apps/web/src` — grepping for `auth/callback`, `getSession`, and `onAuthStateChange` only matches the `redirectTo` string itself. A user who completes the Google OAuth flow is redirected back into the app and lands nowhere useful: nothing exchanges that redirect for a session, `api.auth.me()` still returns `401` (the NestJS API never learns the Supabase OAuth session happened), and the app just re-renders the login page. Google sign-in is currently a dead end in production.

The existing `authentication` capability spec (`openspec/specs/authentication/spec.md`, "Google OAuth Sign-In") only documents *initiating* the redirect — it has no requirement or scenario for what happens when the browser returns from Supabase. This proposal closes that gap.

## What Changes

- Add a callback handler in `apps/web` that, on return from Supabase's OAuth redirect, retrieves the client-side Supabase session (`supabase.auth.getSession()` and/or an `onAuthStateChange` listener) established by that redirect.
- Add a new API endpoint (`apps/api`'s auth module) that accepts the Supabase access/refresh token pair from that completed client-side OAuth session, verifies it with Supabase, and mints the same httpOnly `access_token`/`refresh_token` cookies `auth.service.ts` already issues for password login — so `SupabaseAuthGuard` and every existing protected endpoint keep trusting exactly one session model (the cookie), regardless of which sign-in method produced it.
- Once cookies are set, the callback handler hands off into the normal authenticated app view (same as a successful password login).
- Explicitly out of scope: the email/password login flow, `SupabaseAuthGuard`, and the persons/relationships/trees endpoints are unchanged. This does not introduce React Router or move password-based sessions to a client-owned (browser-held JWT) model — see `design.md` for why that broader change was considered and set aside in favor of this narrower fix.

## Capabilities

**Modified Capabilities:**
- `authentication` — adds a requirement (and scenarios) for completing the Google OAuth callback that the current spec only initiates

## Impact

- Affected code: `apps/web/src/contexts/AuthContext.tsx`, a new callback route/component in `apps/web/src`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.controller.ts` (new endpoint), `apps/web/src/api/client.ts` (new client method)
- No change to `SupabaseAuthGuard`, the password login flow, or any persons/relationships/trees endpoint
- Prerequisite (manual, not part of this change's code): a Supabase project with Google OAuth configured, and matching `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (web) and `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (API) env vars. Real credentials are an environment/deployment concern, not something this proposal resolves.
