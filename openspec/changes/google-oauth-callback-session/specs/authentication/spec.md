## MODIFIED Requirements

### Requirement: Google OAuth Sign-In
The system SHALL support signing in via Google OAuth through the Supabase client SDK from the browser, and SHALL complete the round trip by exchanging the resulting client-side Supabase session for the same httpOnly cookie session the password sign-in flow produces.

#### Scenario: User completes the Google OAuth redirect
- **WHEN** Supabase redirects the browser back to `/auth/callback` after a successful Google sign-in
- **THEN** the web app reads the resulting Supabase session client-side, sends its access and refresh tokens to `POST /api/auth/oauth/session`, and the system verifies them, upserts a `profiles` row, claims the default family tree for the user if unclaimed, and sets the same httpOnly `access_token`/`refresh_token` cookies the password login flow sets

#### Scenario: OAuth session exchange fails
- **WHEN** `POST /api/auth/oauth/session` receives an invalid or expired access token
- **THEN** the system does not set session cookies and returns `401 Unauthorized`, and the callback screen shows an error with a way back to the login page rather than silently redirecting into an unauthenticated state
