import type { APIRequestContext } from '@playwright/test';

const API = 'http://localhost:3001/api';

export async function clearDatabase(request: APIRequestContext) {
  const rels = await (await request.get(`${API}/relationships`)).json();
  for (const r of rels) {
    await request.delete(`${API}/relationships/${r.id}`);
  }
  const persons = await (await request.get(`${API}/persons`)).json();
  for (const p of persons) {
    await request.delete(`${API}/persons/${p.id}`);
  }
}
