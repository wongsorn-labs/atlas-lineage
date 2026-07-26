import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { usePersons } from './hooks/usePersons';
import { useRelationships } from './hooks/useRelationships';
import type { Person, Relationship } from '@wongsorn-labs/atlas-lineage-shared';

vi.mock('./hooks/usePersons');
vi.mock('./hooks/useRelationships');
vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', email: 'test@test.com' }, isLoading: false, signIn: vi.fn(), signOut: vi.fn(), signInWithGoogle: vi.fn() }),
  AuthProvider: ({ children }: { children: import('react').ReactNode }) => <>{children}</>,
}));
vi.mock('./contexts/TreeContext', () => ({
  useTree: () => ({
    trees: [{ id: 1, name: 'Default Tree', description: null, ownerId: '1', createdAt: '', updatedAt: '', role: 'owner' }],
    currentTree: { id: 1, name: 'Default Tree', description: null, ownerId: '1', createdAt: '', updatedAt: '', role: 'owner' },
    currentTreeId: 1,
    isLoading: false,
    setCurrentTreeId: vi.fn(),
  }),
  TreeProvider: ({ children }: { children: import('react').ReactNode }) => <>{children}</>,
}));
vi.mock('./components/Sidebar', () => ({
  Sidebar: ({ persons }: { persons: Person[] }) => (
    <div data-testid="sidebar" data-person-count={persons.length} />
  ),
}));
vi.mock('./components/MapView', () => ({
  MapView: ({ relationships }: { relationships: Relationship[] }) => (
    <div data-testid="map" data-relationship-count={relationships.length} />
  ),
}));

function makePersonsQuery(
  overrides: Partial<ReturnType<typeof usePersons>> = {},
): ReturnType<typeof usePersons> {
  return {
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as ReturnType<typeof usePersons>;
}

function makeRelationshipsQuery(
  overrides: Partial<ReturnType<typeof useRelationships>> = {},
): ReturnType<typeof useRelationships> {
  return {
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useRelationships>;
}

describe('App', () => {
  beforeEach(() => {
    vi.mocked(usePersons).mockReturnValue(makePersonsQuery());
    vi.mocked(useRelationships).mockReturnValue(makeRelationshipsQuery());
  });

  it('shows loading state instead of empty app while data is loading', () => {
    vi.mocked(usePersons).mockReturnValue(makePersonsQuery({ isLoading: true }));

    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading family data');
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
  });

  it('shows an error state with retry actions for failed queries', async () => {
    const retryPeople = vi.fn();
    const retryRelationships = vi.fn();
    vi.mocked(usePersons).mockReturnValue(
      makePersonsQuery({ isError: true, refetch: retryPeople }),
    );
    vi.mocked(useRelationships).mockReturnValue(
      makeRelationshipsQuery({ isError: true, refetch: retryRelationships }),
    );

    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: 'Retry people' }));
    await userEvent.click(screen.getByRole('button', { name: 'Retry relationships' }));

    expect(screen.getByText('Could not load family data')).toBeInTheDocument();
    expect(retryPeople).toHaveBeenCalledTimes(1);
    expect(retryRelationships).toHaveBeenCalledTimes(1);
  });
});
