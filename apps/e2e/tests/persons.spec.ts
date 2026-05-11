import { test, expect } from '@playwright/test';
import { clearDatabase } from './helpers';

const API = 'http://localhost:3001/api';

test.beforeEach(async ({ request }) => {
  await clearDatabase(request);
});

test('add person — visible in sidebar', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('add-person-button').click();
  await page.getByTestId('name-input').fill('Ada Lovelace');
  await page.getByTestId('birth-lat-input').fill('51.5');
  await page.getByTestId('birth-lng-input').fill('-0.1');
  await page.getByRole('button', { name: /add person/i }).click();
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
});

test('edit person — new name visible', async ({ page, request }) => {
  await request.post(`${API}/persons`, { data: { name: 'Ada Lovelace' } });
  await page.goto('/');
  await page.getByText('Ada Lovelace').click();
  await page.getByTestId('edit-person-button').click();
  await page.getByTestId('name-input').fill('Ada Byron');
  await page.getByRole('button', { name: /update/i }).click();
  await expect(page.getByText('Ada Byron')).toBeVisible();
});

test('delete person — name disappears', async ({ page, request }) => {
  await request.post(`${API}/persons`, { data: { name: 'Grace Hopper' } });
  await page.goto('/');
  await page.getByText('Grace Hopper').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('delete-person-button').click();
  await expect(page.getByText('Grace Hopper')).not.toBeVisible();
});

test('validation — name required error shown', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('add-person-button').click();
  await page.getByRole('button', { name: /add person/i }).click();
  await expect(page.getByText('Name is required')).toBeVisible();
});
