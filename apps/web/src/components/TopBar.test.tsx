import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from './TopBar';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: vi.fn(), user: { email: 'test@test.com' } }),
}));
vi.mock('../contexts/TreeContext', () => ({
  useTree: () => ({
    currentTreeId: 1,
    currentTree: { id: 1, name: 'ครอบครัว', role: 'owner' },
    trees: [{ id: 1, name: 'ครอบครัว' }],
    setCurrentTreeId: vi.fn(),
  }),
}));
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
vi.mock('./TreeSwitcher', () => ({ TreeSwitcher: () => <div data-testid="tree-switcher" /> }));

const makePerson = (id: number, name: string, nickname: string | null = null): Person =>
  ({ id, name, nickname, treeId: 1, photo: null, attributes: {}, gender: null, birthYear: null, birthMonth: null, birthDay: null, birthTime: null, deathYear: null, deathMonth: null, deathDay: null, deathTime: null, birthLat: null, birthLng: null, birthPlace: null, notes: null, createdAt: '', updatedAt: '' }) as Person;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe('TopBar', () => {
  it('renders the top bar and no sidebar or person list', () => {
    render(<TopBar persons={[makePerson(1, 'Ada Lovelace')]} onSelectPerson={vi.fn()} />, { wrapper });
    expect(screen.getByTestId('top-bar')).toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
  });

  it('shows matches only while typing, and picking one selects that person', async () => {
    const onSelect = vi.fn();
    render(<TopBar persons={[makePerson(1, 'Alice', 'อลิซ'), makePerson(2, 'Bob')]} onSelectPerson={onSelect} />, { wrapper });
    expect(screen.queryByTestId('person-search-results')).not.toBeInTheDocument();
    await userEvent.type(screen.getByTestId('person-search'), 'อลิซ');
    expect(screen.getByTestId('person-search-results')).toHaveTextContent('อลิซ');
    await userEvent.click(screen.getByRole('button', { name: 'อลิซ' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('opens the user menu with group, account and sign-out sections', async () => {
    render(<TopBar persons={[]} onSelectPerson={vi.fn()} />, { wrapper });
    await userEvent.click(screen.getByTestId('user-menu-button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('tree-switcher')).toBeInTheDocument();
    expect(screen.getByText('test@test.com')).toBeInTheDocument();
  });

  it('the add-person button opens the form dialog', async () => {
    render(<TopBar persons={[]} onSelectPerson={vi.fn()} />, { wrapper });
    await userEvent.click(screen.getByTestId('add-person-button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
