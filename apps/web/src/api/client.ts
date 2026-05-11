import type {
  Person,
  Relationship,
  CreatePersonInput,
  UpdatePersonInput,
  CreateRelationshipInput,
} from '@wongsorn-labs/atlas-lineage-shared';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
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
