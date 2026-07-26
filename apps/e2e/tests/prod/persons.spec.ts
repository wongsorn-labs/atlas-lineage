import { test, expect } from './fixtures';

// GET /persons is mocked and starts empty for every test (fresh mockDataStore
// per test, see fixtures.ts), regardless of what real people exist in prod.

test('add person — visible in sidebar', async ({ signedInPage: page }) => {
  await page.getByTestId('add-person-button').click();
  await page.getByTestId('name-input').fill('Ada Lovelace');
  await page.getByTestId('birth-lat-input').fill('51.5');
  await page.getByTestId('birth-lng-input').fill('-0.1');
  await page.getByRole('button', { name: /add person/i }).click();
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
});

test('edit person — new name visible', async ({ signedInPage: page }) => {
  // Seed via the UI rather than the mock store directly: the real treeId for
  // this prod test account is only known once TreeContext resolves it from
  // the real GET /trees response, so a person must be created through a
  // request the app itself makes.
  await page.getByTestId('add-person-button').click();
  await page.getByTestId('name-input').fill('Ada Lovelace');
  await page.getByRole('button', { name: /add person/i }).click();
  await expect(page.getByText('Ada Lovelace')).toBeVisible();

  await page.getByText('Ada Lovelace').click();
  await page.getByTestId('edit-person-button').click();
  await page.getByTestId('name-input').fill('Ada Byron');
  await page.getByRole('button', { name: /update/i }).click();
  await expect(page.getByText('Ada Byron')).toBeVisible();
});

test('delete person — name disappears', async ({ signedInPage: page }) => {
  await page.getByTestId('add-person-button').click();
  await page.getByTestId('name-input').fill('Grace Hopper');
  await page.getByRole('button', { name: /add person/i }).click();
  await expect(page.getByText('Grace Hopper')).toBeVisible();

  await page.getByText('Grace Hopper').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('delete-person-button').click();
  await expect(page.getByText('Grace Hopper')).not.toBeVisible();
});

test('validation — name required error shown', async ({ signedInPage: page }) => {
  await page.getByTestId('add-person-button').click();
  await page.getByRole('button', { name: /add person/i }).click();
  await expect(page.getByText('Name is required')).toBeVisible();
});
