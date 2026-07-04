import type { APIRequestContext } from '@playwright/test';
import { API_URL, E2E_TEST_EMAIL, E2E_TEST_PASSWORD } from '../e2e.config';

export async function loginTestUser(request: APIRequestContext) {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD },
  });
  if (!res.ok()) {
    throw new Error(`Test login failed: ${res.status()} ${await res.text()}`);
  }
}

export async function clearDatabase(request: APIRequestContext) {
  const rels = await (await request.get(`${API_URL}/relationships`)).json();
  for (const r of rels) {
    await request.delete(`${API_URL}/relationships/${r.id}`);
  }
  const persons = await (await request.get(`${API_URL}/persons`)).json();
  for (const p of persons) {
    await request.delete(`${API_URL}/persons/${p.id}`);
  }
}
