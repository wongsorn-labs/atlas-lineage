import { test, expect } from '@playwright/test';
import { clearDatabase } from './helpers';

const API = 'http://localhost:3001/api';

test.beforeEach(async ({ request }) => {
  await clearDatabase(request);
});

test('add relationship — badge visible', async ({ page, request }) => {
  const ada = await (await request.post(`${API}/persons`, { data: { name: 'Ada' } })).json();
  await request.post(`${API}/persons`, { data: { name: 'Charles' } });

  await page.goto('/');
  await page.getByText('Ada').click();
  await page.getByTestId('add-relationship-button').click();

  await page.getByTestId('related-person-select').click();
  await page.getByRole('option', { name: 'Charles' }).click();
  await page.getByTestId('relationship-type-select').click();
  await page.getByRole('option', { name: 'Spouse' }).click();
  await page.getByRole('button', { name: /add relationship/i }).click();

  await expect(page.getByTestId('relationship-badge').filter({ hasText: /spouse/i })).toBeVisible();

  void ada; // suppress unused warning
});

test('delete relationship — badge gone', async ({ page, request }) => {
  const ada = await (await request.post(`${API}/persons`, { data: { name: 'Ada' } })).json();
  const charles = await (await request.post(`${API}/persons`, { data: { name: 'Charles' } })).json();
  await request.post(`${API}/relationships`, {
    data: { personId: ada.id, relatedPersonId: charles.id, type: 'spouse' },
  });

  await page.goto('/');
  await page.getByText('Ada').click();
  await expect(page.getByTestId('relationship-badge').filter({ hasText: /spouse/i })).toBeVisible();

  await page.locator('[data-testid="add-relationship-button"]').isVisible();
  // Delete the relationship via the trash icon in the relationships list
  await page.locator('.text-red-400').first().click();
  await expect(page.getByTestId('relationship-badge').filter({ hasText: /spouse/i })).not.toBeVisible();
});
