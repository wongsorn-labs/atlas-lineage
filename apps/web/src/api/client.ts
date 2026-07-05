import type {
  Person,
  Relationship,
  CreatePersonInput,
  UpdatePersonInput,
  CreateRelationshipInput,
  FamilyTree,
  FamilyTreeMembership,
  CreateTreeInput,
  AddTreeMemberInput,
  TreeMember,
} from '@wongsorn-labs/atlas-lineage-shared';

const BASE = '/api';
let refreshPromise: Promise<boolean> | null = null;

export type CreatePersonRequest = Omit<CreatePersonInput, 'treeId'>;
export type CreateRelationshipRequest = Omit<CreateRelationshipInput, 'treeId'>;

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
    oauthSession: (accessToken: string, refreshToken: string) =>
      request<{ user: { id: string; email: string } }>('/auth/oauth/session', {
        method: 'POST',
        body: JSON.stringify({ accessToken, refreshToken }),
      }),
  },
  trees: {
    list: () => request<FamilyTreeMembership[]>('/trees'),
    create: (data: CreateTreeInput) =>
      request<FamilyTree>('/trees', { method: 'POST', body: JSON.stringify(data) }),
    addMember: (treeId: number, data: AddTreeMemberInput) =>
      request<TreeMember>(`/trees/${treeId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  },
  persons: {
    list: (treeId: number) => request<Person[]>(`/persons?treeId=${treeId}`),
    get: (id: number, treeId: number) => request<Person>(`/persons/${id}?treeId=${treeId}`),
    create: (data: CreatePersonRequest, treeId: number) =>
      request<Person>('/persons', {
        method: 'POST',
        body: JSON.stringify({ ...data, treeId }),
      }),
    update: (id: number, data: UpdatePersonInput, treeId: number) =>
      request<Person>(`/persons/${id}?treeId=${treeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: number, treeId: number) => request<void>(`/persons/${id}?treeId=${treeId}`, { method: 'DELETE' }),
  },
  relationships: {
    list: (treeId: number) => request<Relationship[]>(`/relationships?treeId=${treeId}`),
    byPerson: (personId: number, treeId: number) =>
      request<Relationship[]>(`/relationships/person/${personId}?treeId=${treeId}`),
    create: (data: CreateRelationshipRequest, treeId: number) =>
      request<Relationship>('/relationships', {
        method: 'POST',
        body: JSON.stringify({ ...data, treeId }),
      }),
    delete: (id: number, treeId: number) => request<void>(`/relationships/${id}?treeId=${treeId}`, { method: 'DELETE' }),
  },
};
