import { test, expect, type Page } from '@playwright/test';
import { API_URL, E2E_TEST_EMAIL, E2E_TEST_PASSWORD } from '../e2e.config';

async function signInViaUi(page: Page, email: string, password: string) {
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

test('unauthenticated visitor sees the login page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  await expect(page.getByTestId('add-person-button')).not.toBeVisible();
});

test('invalid credentials show an error and stay on the login page', async ({ page }) => {
  await page.goto('/');
  await signInViaUi(page, E2E_TEST_EMAIL, 'wrong-password');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('valid credentials sign in, and the session survives a reload', async ({ page }) => {
  await page.goto('/');
  await signInViaUi(page, E2E_TEST_EMAIL, E2E_TEST_PASSWORD);
  await expect(page.getByTestId('add-person-button')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('add-person-button')).toBeVisible();
});

test('guarded API endpoints reject requests without a session', async ({ request }) => {
  const res = await request.get(`${API_URL}/persons`);
  expect(res.status()).toBe(401);
});

test('me endpoint reflects session state before and after login', async ({ page, request: unauthedRequest }) => {
  const before = await unauthedRequest.get(`${API_URL}/auth/me`);
  expect(before.status()).toBe(401);

  await page.goto('/');
  await signInViaUi(page, E2E_TEST_EMAIL, E2E_TEST_PASSWORD);
  await expect(page.getByTestId('add-person-button')).toBeVisible();

  const after = await page.context().request.get(`${API_URL}/auth/me`);
  expect(after.ok()).toBe(true);
  expect((await after.json()).email).toBe(E2E_TEST_EMAIL);
});

test('sign out clears the session and returns to the login page', async ({ page }) => {
  await page.goto('/');
  await signInViaUi(page, E2E_TEST_EMAIL, E2E_TEST_PASSWORD);
  await expect(page.getByTestId('add-person-button')).toBeVisible();

  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

  const res = await page.context().request.get(`${API_URL}/persons`);
  expect(res.status()).toBe(401);
});

test('expired access token is refreshed transparently and the request is retried', async ({ page }) => {
  await page.goto('/');
  await signInViaUi(page, E2E_TEST_EMAIL, E2E_TEST_PASSWORD);
  await expect(page.getByTestId('add-person-button')).toBeVisible();

  // Simulate access-token expiry while keeping the refresh cookie, then force
  // a fresh request. api/client.ts should catch the 401, call /auth/refresh,
  // and retry once rather than bouncing the user to /login.
  await page.context().clearCookies({ name: 'access_token' });
  await page.reload();

  await expect(page.getByTestId('add-person-button')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).not.toBeVisible();
});
