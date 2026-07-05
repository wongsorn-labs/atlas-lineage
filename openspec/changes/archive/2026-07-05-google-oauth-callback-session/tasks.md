## 1. API: session handoff endpoint

- [x] 1.1 Add `AuthService.exchangeOAuthSession(accessToken, refreshToken)` to `apps/api/src/auth/auth.service.ts`, mirroring `signIn`'s post-verification steps (`supabase.auth.getUser(accessToken)` instead of `signInWithPassword`, then `upsertProfile` + `claimDefaultTree`, returning the same `{ accessToken, refreshToken, expiresIn, user }` shape)
- [x] 1.2 Add `POST /api/auth/oauth/session` to `apps/api/src/auth/auth.controller.ts`, reusing the same cookie-setting logic `login` already uses (same names, paths, `httpOnly`/`secure`/`SameSite` flags per the "Session Persistence via HttpOnly Cookies" requirement)
- [x] 1.3 Add a DTO + `class-validator` decorators for the request body (`accessToken`, `refreshToken`). Note: `auth.controller.ts`'s existing endpoints (`login`, etc.) use plain inline types with no DTO, but the repo-wide convention (`persons`/`relationships` DTOs, enforced by the global `ValidationPipe`) does use `class-validator` classes — followed that convention here (`apps/api/src/auth/dto/oauth-session.dto.ts`) rather than the auth module's own inconsistent precedent.
- [x] 1.4 Unit tests in `apps/api/src/auth/*.spec.ts`: valid token pair sets cookies and returns the user; invalid/expired token returns `401` with no cookies set. Added at the controller level (mocking `AuthService.exchangeOAuthSession`), matching how `login`/`refresh`/`logout` are already tested — no dedicated `auth.service.spec.ts` exists for any method, so one wasn't added just for this one.

## 2. Web: callback route

- [x] 2.1 Add a callback component/route reachable at `/auth/callback` (`apps/web/src/pages/AuthCallbackPage.tsx`, gated in `App.tsx` via `window.location.pathname === '/auth/callback'`, checked before the `authLoading`/`user`/`currentTreeId` branches so it renders independent of session state)
- [x] 2.2 On mount, call `supabase.auth.getSession()`; show a loading state (matching the existing spinner pattern in `App.tsx`) until it resolves. Note: skipped the `onAuthStateChange` fallback — supabase-js v2's `getSession()` internally awaits the client's initialize lock, which includes the `detectSessionInUrl` URL-fragment parse, so it already resolves only once that's done; a separate listener would be redundant.
- [x] 2.3 POST the returned `access_token`/`refresh_token` to the new `/api/auth/oauth/session` endpoint via a new `api.auth.oauthSession(...)` method in `apps/web/src/api/client.ts` (logic lives in `AuthContext.completeOAuthCallback`, called from the page component)
- [x] 2.4 On success: call `supabase.auth.signOut({ scope: 'local' })` to drop the client-held session (the httpOnly cookie is now the source of truth), then navigate to `/` and let `AuthContext`'s existing `me()` check pick up the new cookie session
- [x] 2.5 On failure: surface an error state on the callback screen with a way back to the login page (don't silently redirect into a broken state)
- [x] 2.6 Component test for the callback (`apps/web/src/pages/AuthCallbackPage.test.tsx`, mocking `useAuth().completeOAuthCallback`) covering success (navigates via `window.location.replace`) and failure (shows error + back-to-login link, no navigation) paths

## 3. Spec / docs

- [x] 3.1 Confirm the delta spec in `specs/authentication/spec.md` (this change) matches the implemented scenarios exactly before archiving
- [x] 3.2 Note the Supabase dashboard prerequisite (registering `${origin}/auth/callback` as an allowed redirect URL per environment) in `CLAUDE.md`'s environment setup section

## 4. Manual verification (not automatable without a real Google account)

- [ ] 4.1 Configure a real Supabase project with Google OAuth enabled and the callback URL allowlisted for local dev
- [ ] 4.2 Click through the real Google sign-in flow locally and confirm: cookies are set, `GET /api/auth/me` returns the user, reload keeps the session, and the app renders the normal authenticated view (not `LoginPage`)
