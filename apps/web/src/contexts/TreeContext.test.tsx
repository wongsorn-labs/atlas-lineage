import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { TreeProvider, useTree } from './TreeContext';

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com' } }),
}));

function TestConsumer() {
  const { currentTreeId, isLoading } = useTree();
  if (isLoading) return <div>loading</div>;
  return <div data-testid="current-tree">{currentTreeId ?? 'none'}</div>;
}

function renderWithProvider() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TreeProvider>
        <TestConsumer />
      </TreeProvider>
    </QueryClientProvider>,
  );
}

describe('TreeContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to the first tree when nothing is remembered', async () => {
    server.use(http.get('/api/trees', () => HttpResponse.json([
      { id: 5, name: 'Tree A', description: null, ownerId: 'user-1', createdAt: '', updatedAt: '', role: 'owner' },
      { id: 6, name: 'Tree B', description: null, ownerId: 'user-1', createdAt: '', updatedAt: '', role: 'viewer' },
    ])));

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('current-tree')).toHaveTextContent('5'));
  });

  it('falls back to the first tree when the remembered id no longer exists', async () => {
    localStorage.setItem('currentTreeId', '999');
    server.use(http.get('/api/trees', () => HttpResponse.json([
      { id: 5, name: 'Tree A', description: null, ownerId: 'user-1', createdAt: '', updatedAt: '', role: 'owner' },
    ])));

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('current-tree')).toHaveTextContent('5'));
  });

  it('restores the remembered tree id when still valid', async () => {
    localStorage.setItem('currentTreeId', '6');
    server.use(http.get('/api/trees', () => HttpResponse.json([
      { id: 5, name: 'Tree A', description: null, ownerId: 'user-1', createdAt: '', updatedAt: '', role: 'owner' },
      { id: 6, name: 'Tree B', description: null, ownerId: 'user-1', createdAt: '', updatedAt: '', role: 'viewer' },
    ])));

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('current-tree')).toHaveTextContent('6'));
  });
});
