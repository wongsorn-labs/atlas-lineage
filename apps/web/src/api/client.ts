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
let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

async function request<T>(url: string, options?: RequestInit, retry = true): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
    ...options,
  });

  if (res.status === 401 && retry) {
    if (isRefreshing) {
      return new Promise<T>((resolve) => {
        refreshQueue.push(() => resolve(request<T>(url, options, false)));
      });
    }
    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!refreshRes.ok) throw new Error('Refresh failed');
      refreshQueue.forEach((fn) => fn());
      refreshQueue = [];
      return request<T>(url, options, false);
    } catch {
      refreshQueue = [];
      window.location.href = '/login';
      throw new Error('Session expired');
    } finally {
      isRefreshing = false;
    }
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
    list: () => request<Person[]>('/persons'),
    get: (id: number) => request<Person>(`/persons/${id}`),
    create: (data: CreatePersonInput) =>
      request<Person>('/persons', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: UpdatePersonInput) =>
      request<Person>(`/persons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/persons/${id}`, { method: 'DELETE' }),
  },
  relationships: {
    list: () => request<Relationship[]>('/relationships'),
    byPerson: (personId: number) =>
      request<Relationship[]>(`/relationships/person/${personId}`),
    create: (data: CreateRelationshipInput) =>
      request<Relationship>('/relationships', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/relationships/${id}`, { method: 'DELETE' }),
  },
};
