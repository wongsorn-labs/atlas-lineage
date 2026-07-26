# authentication Specification

## Purpose
Authenticate users via Supabase (email/password and Google OAuth), maintain sessions in httpOnly cookies, and gate access to the API's protected endpoints.
## Requirements
### Requirement: Email/Password Sign-In
The system SHALL authenticate users against Supabase Auth using email and password, and SHALL establish a session via httpOnly cookies.

#### Scenario: Successful login
- **WHEN** a client POSTs `/api/auth/login` with a valid `email` and `password`
- **THEN** the system verifies the credentials with Supabase, upserts a `profiles` row, claims the default family tree for the user if unclaimed, sets httpOnly `access_token` and `refresh_token` cookies, and returns the user's `id` and `email`

#### Scenario: Invalid credentials
- **WHEN** a client POSTs `/api/auth/login` with incorrect credentials
- **THEN** the system does not set session cookies and returns an error

### Requirement: Google OAuth Sign-In
The system SHALL support signing in via Google OAuth through the Supabase client SDK from the browser, and SHALL complete the round trip by exchanging the resulting client-side Supabase session for the same httpOnly cookie session the password sign-in flow produces.

#### Scenario: User initiates Google sign-in
- **WHEN** a user clicks the Google sign-in option on the login page
- **THEN** the web app calls Supabase's `signInWithOAuth` with provider `google` and a redirect back to the app's origin

#### Scenario: User completes the Google OAuth redirect
- **WHEN** Supabase redirects the browser back to `/auth/callback` after a successful Google sign-in
- **THEN** the web app reads the resulting Supabase session client-side, sends its access and refresh tokens to `POST /api/auth/oauth/session`, and the system verifies them, upserts a `profiles` row, claims the default family tree for the user if unclaimed, and sets the same httpOnly `access_token`/`refresh_token` cookies the password login flow sets

#### Scenario: OAuth session exchange fails
- **WHEN** `POST /api/auth/oauth/session` receives an invalid or expired access token
- **THEN** the system does not set session cookies and returns `401 Unauthorized`, and the callback screen shows an error with a way back to the login page rather than silently redirecting into an unauthenticated state

### Requirement: Session Persistence via HttpOnly Cookies
The system SHALL store the Supabase access and refresh tokens in httpOnly, `SameSite=Lax` cookies, with the refresh cookie scoped to the refresh endpoint path only.

#### Scenario: Cookies set on login
- **WHEN** a login or refresh succeeds
- **THEN** the system sets `access_token` (path `/`) and `refresh_token` (path `/api/auth/refresh`) cookies, both httpOnly, and `secure` when `NODE_ENV=production`

### Requirement: Session Check
The system SHALL expose an endpoint to check the current session.

#### Scenario: Valid session
- **WHEN** a client GETs `/api/auth/me` with a valid `access_token` cookie
- **THEN** the system returns the authenticated user's `id` and `email`

#### Scenario: No or invalid session
- **WHEN** a client GETs `/api/auth/me` without a valid `access_token` cookie
- **THEN** the system responds with `401 Unauthorized`

### Requirement: Automatic Token Refresh on Expiry
The system SHALL transparently refresh an expired access token and retry the original request exactly once.

#### Scenario: Access token expired mid-request
- **WHEN** the web app's API client receives a `401` response for a request
- **THEN** it calls `/api/auth/refresh` using the refresh cookie, and if that succeeds, retries the original request once with the new session

#### Scenario: Refresh fails
- **WHEN** the refresh request itself fails or the refresh token is invalid
- **THEN** the original request rejects without retrying; the app has no dedicated `/login` route, so it relies on `user` being cleared (e.g. by the initial `/auth/me` check on boot, which goes through this same refresh path) to fall back to rendering `LoginPage` rather than forcing a hard navigation

#### Scenario: Concurrent 401s share a single refresh
- **WHEN** multiple requests receive `401` while a refresh is already in flight
- **THEN** the system queues those requests and retries all of them once the in-flight refresh completes, rather than issuing multiple concurrent refresh calls

### Requirement: Sign-Out
The system SHALL invalidate the Supabase session and clear session cookies on sign-out.

#### Scenario: Logout clears session
- **WHEN** a client POSTs `/api/auth/logout` with a valid `access_token` cookie
- **THEN** the system calls Supabase to sign out the token and clears both the `access_token` and `refresh_token` cookies

### Requirement: Guarded Endpoints Require Authentication
The system SHALL reject unauthenticated requests to protected endpoints with `401 Unauthorized`.

#### Scenario: Missing token
- **WHEN** a request to `/api/persons*`, `/api/relationships*`, or `/api/trees*` has no `access_token` cookie
- **THEN** `SupabaseAuthGuard` throws `401 Unauthorized` before the request reaches the controller handler

#### Scenario: Invalid or expired token
- **WHEN** the `access_token` cookie does not correspond to a valid Supabase session
- **THEN** `SupabaseAuthGuard` throws `401 Unauthorized`

