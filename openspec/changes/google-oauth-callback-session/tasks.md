## 1. API: session handoff endpoint

- [ ] 1.1 Add `AuthService.exchangeOAuthSession(accessToken, refreshToken)` to `apps/api/src/auth/auth.service.ts`, mirroring `signIn`'s post-verification steps (`supabase.auth.getUser(accessToken)` instead of `signInWithPassword`, then `upsertProfile` + `claimDefaultTree`, returning the same `{ accessToken, refreshToken, expiresIn, user }` shape)
- [ ] 1.2 Add `POST /api/auth/oauth/session` to `apps/api/src/auth/auth.controller.ts`, reusing the same cookie-setting logic `login` already uses (same names, paths, `httpOnly`/`secure`/`SameSite` flags per the "Session Persistence via HttpOnly Cookies" requirement)
- [ ] 1.3 Add a DTO + `class-validator` decorators for the request body (`accessToken`, `refreshToken`), matching the existing DTO style in `apps/api/src/auth`
- [ ] 1.4 Unit tests in `apps/api/src/auth/*.spec.ts`: valid token pair sets cookies and returns the user; invalid/expired token returns `401` with no cookies set

## 2. Web: callback route

- [ ] 2.1 Add a callback component/route reachable at `/auth/callback` (no router library exists yet — gate rendering on `window.location.pathname === '/auth/callback'` at the same level `App.tsx` currently branches on `user`/`currentTreeId`, rather than introducing React Router for one route)
- [ ] 2.2 On mount, call `supabase.auth.getSession()` (fall back to an `onAuthStateChange` listener if the session isn't immediately available post-redirect); show a loading state (matching the existing `authLoading`/`treesLoading` spinner pattern in `App.tsx`) until it resolves
- [ ] 2.3 POST the returned `access_token`/`refresh_token` to the new `/api/auth/oauth/session` endpoint via a new `api.auth.oauthSession(...)` method in `apps/web/src/api/client.ts`
- [ ] 2.4 On success: call `supabase.auth.signOut({ scope: 'local' })` to drop the client-held session (the httpOnly cookie is now the source of truth), then navigate to `/` and let `AuthContext`'s existing `me()` check pick up the new cookie session
- [ ] 2.5 On failure: surface an error state on the callback screen with a way back to the login page (don't silently redirect into a broken state)
- [ ] 2.6 Component test for the callback (mock `supabase.auth.getSession` + mock the new API call) covering success and failure paths

## 3. Spec / docs

- [ ] 3.1 Confirm the delta spec in `specs/authentication/spec.md` (this change) matches the implemented scenarios exactly before archiving
- [ ] 3.2 Note the Supabase dashboard prerequisite (registering `${origin}/auth/callback` as an allowed redirect URL per environment) in `CLAUDE.md`'s environment setup section

## 4. Manual verification (not automatable without a real Google account)

- [ ] 4.1 Configure a real Supabase project with Google OAuth enabled and the callback URL allowlisted for local dev
- [ ] 4.2 Click through the real Google sign-in flow locally and confirm: cookies are set, `GET /api/auth/me` returns the user, reload keeps the session, and the app renders the normal authenticated view (not `LoginPage`)
