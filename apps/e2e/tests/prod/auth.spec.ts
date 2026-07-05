import { test, expect } from './fixtures';
import { E2E_TEST_EMAIL } from '../../prod.e2e.config';

// Auth hits the real prod API in this suite (see prod.e2e.config.ts), so
// these tests exercise the actual deployed login flow end-to-end. Only
// /api/persons and /api/relationships are mocked (via the mockDataStore
// fixture pulled in through fixtures.ts), so no real family-tree data is
// ever touched.

test('unauthenticated visitor sees the login page', async ({ page, mockDataStore }) => {
  void mockDataStore;
  await page.goto('/');
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  await expect(page.getByTestId('add-person-button')).not.toBeVisible();
});

test('invalid credentials show an error and stay on the login page', async ({ page, mockDataStore }) => {
  void mockDataStore;
  await page.goto('/');
  await page.getByLabel(/email/i).fill(E2E_TEST_EMAIL as string);
  await page.getByLabel(/password/i).fill('definitely-wrong-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('valid credentials sign in, and the session survives a reload', async ({ signedInPage: page }) => {
  await page.reload();
  await expect(page.getByTestId('add-person-button')).toBeVisible();
});

test('sign out clears the session and returns to the login page', async ({ signedInPage: page }) => {
  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});
