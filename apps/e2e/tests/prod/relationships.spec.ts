import { test, expect } from './fixtures';

async function addPersonViaUi(page: import('@playwright/test').Page, name: string) {
  await page.getByTestId('add-person-button').click();
  await page.getByTestId('name-input').fill(name);
  await page.getByRole('button', { name: /add person/i }).click();
  await expect(page.getByText(name)).toBeVisible();
}

test('add relationship — badge visible', async ({ signedInPage: page }) => {
  await addPersonViaUi(page, 'Ada');
  await addPersonViaUi(page, 'Charles');

  await page.getByText('Ada').click();
  await page.getByTestId('add-relationship-button').click();

  await page.getByTestId('related-person-select').click();
  await page.getByRole('option', { name: 'Charles' }).click();
  await page.getByTestId('relationship-type-select').click();
  await page.getByRole('option', { name: 'Spouse' }).click();
  await page.getByRole('button', { name: /add relationship/i }).click();

  await expect(page.getByTestId('relationship-badge').filter({ hasText: /spouse/i })).toBeVisible();
});

test('delete relationship — badge gone', async ({ signedInPage: page }) => {
  await addPersonViaUi(page, 'Ada');
  await addPersonViaUi(page, 'Charles');

  await page.getByText('Ada').click();
  await page.getByTestId('add-relationship-button').click();
  await page.getByTestId('related-person-select').click();
  await page.getByRole('option', { name: 'Charles' }).click();
  await page.getByTestId('relationship-type-select').click();
  await page.getByRole('option', { name: 'Spouse' }).click();
  await page.getByRole('button', { name: /add relationship/i }).click();
  await expect(page.getByTestId('relationship-badge').filter({ hasText: /spouse/i })).toBeVisible();

  await page.getByTestId('delete-relationship-button').click();
  await expect(page.getByTestId('relationship-badge').filter({ hasText: /spouse/i })).not.toBeVisible();
});
