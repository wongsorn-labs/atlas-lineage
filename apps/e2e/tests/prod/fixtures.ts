import { test as base, expect, type Page } from '@playwright/test';
import { E2E_TEST_EMAIL, E2E_TEST_PASSWORD } from '../../prod.e2e.config';
import { createMockDataStore, installMockDataApi, type MockDataStore } from './mock-data-api';

if (!E2E_TEST_EMAIL || !E2E_TEST_PASSWORD) {
  throw new Error(
    'E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set to a real prod test account ' +
      '(auth is not mocked by this suite — see prod.e2e.config.ts).',
  );
}

export async function signInViaUi(page: Page) {
  await page.goto('/');
  await page.getByLabel(/email/i).fill(E2E_TEST_EMAIL as string);
  await page.getByLabel(/password/i).fill(E2E_TEST_PASSWORD as string);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByTestId('add-person-button')).toBeVisible();
}

export const test = base.extend<{ mockDataStore: MockDataStore; signedInPage: Page }>({
  mockDataStore: async ({ context }, use) => {
    const store = createMockDataStore();
    await installMockDataApi(context, store);
    await use(store);
  },
  signedInPage: async ({ page, mockDataStore }, use) => {
    void mockDataStore; // ensures the data mock is installed before sign-in navigates
    await signInViaUi(page);
    await use(page);
  },
});

export { expect };
