import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { usePersons, useCreatePerson } from './usePersons';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('usePersons', () => {
  it('fetches and returns persons list', async () => {
    const persons = [{ id: 1, name: 'Ada', birthYear: null, deathYear: null, birthLat: null, birthLng: null, birthPlace: null, notes: null, createdAt: '', updatedAt: '' }];
    server.use(http.get('/api/persons', () => HttpResponse.json(persons)));

    const { result } = renderHook(() => usePersons(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(persons);
  });
});

describe('useCreatePerson', () => {
  it('sends POST and returns created person', async () => {
    const created = { id: 2, name: 'Grace', birthYear: null, deathYear: null, birthLat: null, birthLng: null, birthPlace: null, notes: null, createdAt: '', updatedAt: '' };
    server.use(http.post('/api/persons', () => HttpResponse.json(created, { status: 201 })));

    const { result } = renderHook(() => useCreatePerson(), { wrapper: makeWrapper() });
    const data = await result.current.mutateAsync({ name: 'Grace' });
    expect(data).toEqual(created);
  });
});
