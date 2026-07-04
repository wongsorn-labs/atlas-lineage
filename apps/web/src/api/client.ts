import type {
  Person,
  Relationship,
  CreatePersonInput,
  UpdatePersonInput,
  CreateRelationshipInput,
  FamilyTree,
  CreateTreeInput,
  AddTreeMemberInput,
  TreeMember,
} from '@wongsorn-labs/atlas-lineage-shared';

const BASE = '/api';
// The web app has no tree-selection UI yet; every request is scoped to the
// single tree every user auto-claims membership of on first sign-in (see
// claimDefaultTree in packages/db/src/queries/trees.ts).
const DEFAULT_TREE_ID = 1;
let refreshPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(url: string, options?: RequestInit, retry = true): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
    ...options,
  });

  if (res.status === 401 && retry) {
    // Concurrent 401s share the same in-flight refresh instead of each
    // issuing their own; every caller (including the initial session check
    // on app boot) just sees a rejected promise on failure and reacts to
    // that — there's no dedicated /login route to force-navigate to, the
    // app already renders LoginPage whenever `user` is null.
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(url, options, false);
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: { id: string; email: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    me: () => request<{ id: string; email: string }>('/auth/me'),
  },
  trees: {
    list: () => request<FamilyTree[]>('/trees'),
    create: (data: CreateTreeInput) =>
      request<FamilyTree>('/trees', { method: 'POST', body: JSON.stringify(data) }),
    addMember: (treeId: number, data: AddTreeMemberInput) =>
      request<TreeMember>(`/trees/${treeId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  },
  persons: {
    list: () => request<Person[]>(`/persons?treeId=${DEFAULT_TREE_ID}`),
    get: (id: number) => request<Person>(`/persons/${id}?treeId=${DEFAULT_TREE_ID}`),
    create: (data: Omit<CreatePersonInput, 'treeId'>) =>
      request<Person>('/persons', {
        method: 'POST',
        body: JSON.stringify({ ...data, treeId: DEFAULT_TREE_ID }),
      }),
    update: (id: number, data: UpdatePersonInput) =>
      request<Person>(`/persons/${id}?treeId=${DEFAULT_TREE_ID}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: number) => request<void>(`/persons/${id}?treeId=${DEFAULT_TREE_ID}`, { method: 'DELETE' }),
  },
  relationships: {
    list: () => request<Relationship[]>(`/relationships?treeId=${DEFAULT_TREE_ID}`),
    byPerson: (personId: number) =>
      request<Relationship[]>(`/relationships/person/${personId}?treeId=${DEFAULT_TREE_ID}`),
    create: (data: Omit<CreateRelationshipInput, 'treeId'>) =>
      request<Relationship>('/relationships', {
        method: 'POST',
        body: JSON.stringify({ ...data, treeId: DEFAULT_TREE_ID }),
      }),
    delete: (id: number) => request<void>(`/relationships/${id}?treeId=${DEFAULT_TREE_ID}`, { method: 'DELETE' }),
  },
};
