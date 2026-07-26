/**
 * In-memory stand-in for the /api/persons and /api/relationships endpoints,
 * installed as Playwright route handlers on a browser context. Auth
 * (/api/auth/*) and /api/trees are left alone and hit the real prod API —
 * only the data endpoints are intercepted, so the prod smoke suite can
 * create/edit/delete people and relationships without ever touching real
 * production data. Each test gets its own store (see fixtures.ts), so state
 * never leaks between tests.
 */
import type { BrowserContext, Route } from '@playwright/test';
import type {
  Person,
  Relationship,
  CreatePersonInput,
  UpdatePersonInput,
  CreateRelationshipInput,
} from '@wongsorn-labs/atlas-lineage-shared';

export interface MockDataStore {
  persons: Person[];
  relationships: Relationship[];
}

export function createMockDataStore(): MockDataStore {
  return { persons: [], relationships: [] };
}

function json(route: Route, status: number, body?: unknown) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: body === undefined ? '' : JSON.stringify(body),
  });
}

function notFound(route: Route, message: string) {
  return json(route, 404, { statusCode: 404, message });
}

export async function installMockDataApi(context: BrowserContext, store: MockDataStore) {
  let nextPersonId = 1;
  let nextRelationshipId = 1;

  await context.route('**/api/persons**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const idMatch = url.pathname.match(/\/api\/persons\/(\d+)$/);

    if (method === 'GET' && !idMatch) {
      const treeId = Number(url.searchParams.get('treeId'));
      return json(route, 200, store.persons.filter((p) => p.treeId === treeId));
    }
    if (method === 'GET' && idMatch) {
      const person = store.persons.find((p) => p.id === Number(idMatch[1]));
      return person ? json(route, 200, person) : notFound(route, 'Person not found');
    }
    if (method === 'POST') {
      const body = req.postDataJSON() as CreatePersonInput;
      const now = new Date().toISOString();
      const person: Person = {
        id: nextPersonId++,
        treeId: body.treeId,
        name: body.name,
        birthYear: body.birthYear ?? null,
        deathYear: body.deathYear ?? null,
        birthLat: body.birthLat ?? null,
        birthLng: body.birthLng ?? null,
        birthPlace: body.birthPlace ?? null,
        notes: body.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };
      store.persons.push(person);
      return json(route, 201, person);
    }
    if (method === 'PATCH' && idMatch) {
      const person = store.persons.find((p) => p.id === Number(idMatch[1]));
      if (!person) return notFound(route, 'Person not found');
      Object.assign(person, req.postDataJSON() as UpdatePersonInput, { updatedAt: new Date().toISOString() });
      return json(route, 200, person);
    }
    if (method === 'DELETE' && idMatch) {
      const id = Number(idMatch[1]);
      store.persons = store.persons.filter((p) => p.id !== id);
      store.relationships = store.relationships.filter((r) => r.personId !== id && r.relatedPersonId !== id);
      return json(route, 204);
    }

    return route.continue();
  });

  await context.route('**/api/relationships**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const byPersonMatch = url.pathname.match(/\/api\/relationships\/person\/(\d+)$/);
    const idMatch = !byPersonMatch && url.pathname.match(/\/api\/relationships\/(\d+)$/);

    if (method === 'GET' && byPersonMatch) {
      const personId = Number(byPersonMatch[1]);
      return json(
        route,
        200,
        store.relationships.filter((r) => r.personId === personId || r.relatedPersonId === personId),
      );
    }
    if (method === 'GET' && !idMatch) {
      const treeId = Number(url.searchParams.get('treeId'));
      return json(route, 200, store.relationships.filter((r) => r.treeId === treeId));
    }
    if (method === 'POST') {
      const body = req.postDataJSON() as CreateRelationshipInput;
      const relationship: Relationship = {
        id: nextRelationshipId++,
        treeId: body.treeId,
        personId: body.personId,
        relatedPersonId: body.relatedPersonId,
        type: body.type,
        createdAt: new Date().toISOString(),
      };
      store.relationships.push(relationship);
      return json(route, 201, relationship);
    }
    if (method === 'DELETE' && idMatch) {
      const id = Number(idMatch[1]);
      store.relationships = store.relationships.filter((r) => r.id !== id);
      return json(route, 204);
    }

    return route.continue();
  });
}
