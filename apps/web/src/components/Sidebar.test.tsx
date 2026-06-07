import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: vi.fn(), user: { email: 'test@test.com' } }),
}));

vi.mock('./PersonCard', () => ({
  PersonCard: ({ person }: { person: Person }) => (
    <div data-testid={`person-item-${person.id}`}>{person.name}</div>
  ),
}));

vi.mock('./PersonForm', () => ({
  PersonForm: ({ onCancel }: { onCancel: () => void }) => (
    <div>
      <span>Person form</span>
      <button type="button" onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('@/hooks/usePersons', () => ({
  useCreatePerson: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

const makePerson = (id: number, name: string, overrides: Partial<Person> = {}): Person => ({
  id, name, birthYear: null, deathYear: null,
  birthLat: null, birthLng: null, birthPlace: null, notes: null,
  createdAt: '', updatedAt: '', ...overrides,
});

describe('Sidebar', () => {
  it('shows empty state when persons is empty', () => {
    render(<Sidebar persons={[]} selectedPerson={null} onSelectPerson={vi.fn()} />, { wrapper });
    expect(screen.getByText('No people found')).toBeInTheDocument();
  });

  it('renders person names when persons provided', () => {
    const persons = [makePerson(1, 'Ada Lovelace'), makePerson(2, 'Grace Hopper')];
    render(<Sidebar persons={persons} selectedPerson={null} onSelectPerson={vi.fn()} />, { wrapper });
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  });

  it('renders a PersonCard for each person', () => {
    const persons = [makePerson(1, 'Ada Lovelace')];
    render(<Sidebar persons={persons} selectedPerson={null} onSelectPerson={vi.fn()} />, { wrapper });
    expect(screen.getByTestId('person-item-1')).toBeInTheDocument();
  });

  it('filters persons by search input', async () => {
    const mockPersons = [
      { id: 1, name: 'Alice', birthYear: 1990, deathYear: null, birthLat: null, birthLng: null, birthPlace: null, notes: null, createdAt: '', updatedAt: '' },
      { id: 2, name: 'Bob', birthYear: 1985, deathYear: null, birthLat: null, birthLng: null, birthPlace: null, notes: null, createdAt: '', updatedAt: '' },
    ];
    render(<Sidebar persons={mockPersons} selectedPerson={null} onSelectPerson={vi.fn()} />, { wrapper });
    const searchInput = screen.getByPlaceholderText('Search people…');
    await userEvent.type(searchInput, 'Alice');
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('Add button opens dialog', async () => {
    render(<Sidebar persons={[]} selectedPerson={null} onSelectPerson={vi.fn()} />, { wrapper });
    await userEvent.click(screen.getByTestId('add-person-button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add person')).toBeInTheDocument();
  });

  it('shows person count', () => {
    const persons = [makePerson(1, 'Ada Lovelace'), makePerson(2, 'Grace Hopper')];
    render(<Sidebar persons={persons} selectedPerson={null} onSelectPerson={vi.fn()} />, { wrapper });
    expect(screen.getByText('2 people')).toBeInTheDocument();
  });

  it('shows user email in footer', () => {
    render(<Sidebar persons={[]} selectedPerson={null} onSelectPerson={vi.fn()} />, { wrapper });
    expect(screen.getByText('test@test.com')).toBeInTheDocument();
  });
});
