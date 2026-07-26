/**
 * Minimal stand-in for the Supabase Auth (GoTrue) REST API, used by the
 * Playwright e2e suite so the authentication full-loop test can run
 * offline/deterministically without a real Supabase project. Implements
 * only the endpoints `@supabase/auth-js` calls from this app:
 * POST /auth/v1/token?grant_type=password|refresh_token, GET /auth/v1/user,
 * POST /auth/v1/logout. Set SUPABASE_URL to a real project to bypass this
 * and exercise the real Supabase full loop instead (see playwright.config.ts).
 */
const http = require('http');
const crypto = require('crypto');

const PORT = Number(process.env.PORT ?? 54331);
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e@atlaslineage.test';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'Test-Password-123!';

const users = new Map([[TEST_EMAIL, { id: crypto.randomUUID(), email: TEST_EMAIL, password: TEST_PASSWORD }]]);
// accessToken/refreshToken -> user email, so /user and /logout can resolve identity
const accessTokens = new Map();
const refreshTokens = new Map();

function issueSession(user) {
  const accessToken = crypto.randomBytes(24).toString('hex');
  const refreshToken = crypto.randomBytes(24).toString('hex');
  accessTokens.set(accessToken, user.email);
  refreshTokens.set(refreshToken, user.email);
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: refreshToken,
    user: toGoTrueUser(user),
  };
}

function toGoTrueUser(user) {
  const now = new Date().toISOString();
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_confirmed_at: now,
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: now,
    updated_at: now,
  };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function bearerToken(req) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  if (req.method === 'POST' && url.pathname === '/auth/v1/token') {
    const grantType = url.searchParams.get('grant_type');
    const body = await readJsonBody(req).catch(() => null);
    if (!body) return sendJson(res, 400, { msg: 'Invalid request body', error_code: 'bad_json' });

    if (grantType === 'password') {
      const user = users.get(body.email);
      if (!user || user.password !== body.password) {
        return sendJson(res, 400, { msg: 'Invalid login credentials', error_code: 'invalid_credentials' });
      }
      return sendJson(res, 200, issueSession(user));
    }

    if (grantType === 'refresh_token') {
      const email = refreshTokens.get(body.refresh_token);
      const user = email ? users.get(email) : undefined;
      if (!user) {
        return sendJson(res, 400, { msg: 'Invalid Refresh Token: Refresh Token Not Found', error_code: 'refresh_token_not_found' });
      }
      refreshTokens.delete(body.refresh_token);
      return sendJson(res, 200, issueSession(user));
    }

    return sendJson(res, 400, { msg: `Unsupported grant_type: ${grantType}`, error_code: 'unsupported_grant_type' });
  }

  if (req.method === 'GET' && url.pathname === '/auth/v1/user') {
    const token = bearerToken(req);
    const email = token ? accessTokens.get(token) : undefined;
    const user = email ? users.get(email) : undefined;
    if (!user) return sendJson(res, 401, { msg: 'invalid claim: missing sub claim', error_code: 'bad_jwt' });
    return sendJson(res, 200, toGoTrueUser(user));
  }

  if (req.method === 'POST' && url.pathname === '/auth/v1/logout') {
    const token = bearerToken(req);
    if (token) {
      const email = accessTokens.get(token);
      accessTokens.delete(token);
      if (email) {
        for (const [rt, rtEmail] of refreshTokens) {
          if (rtEmail === email) refreshTokens.delete(rt);
        }
      }
    }
    res.writeHead(204);
    return res.end();
  }

  sendJson(res, 404, { msg: `Not found: ${req.method} ${url.pathname}`, error_code: 'not_found' });
});

server.listen(PORT, () => {
  console.log(`[mock-supabase] listening on http://localhost:${PORT} (test user: ${TEST_EMAIL})`);
});
