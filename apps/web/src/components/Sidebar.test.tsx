import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

const makePerson = (id: number, name: string): Person => ({
  id, name, birthYear: null, deathYear: null,
  birthLat: null, birthLng: null, birthPlace: null, notes: null,
  createdAt: '', updatedAt: '',
});

describe('Sidebar', () => {
  it('shows empty state when persons is empty', () => {
    render(<Sidebar persons={[]} selectedPerson={null} onSelectPerson={vi.fn()} />, { wrapper });
    expect(screen.getByText(/Add your first family member/i)).toBeInTheDocument();
  });

  it('renders person names when persons provided', () => {
    const persons = [makePerson(1, 'Ada Lovelace'), makePerson(2, 'Grace Hopper')];
    render(<Sidebar persons={persons} selectedPerson={null} onSelectPerson={vi.fn()} />, { wrapper });
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  });

  it('calls onSelectPerson when person item clicked', async () => {
    const onSelectPerson = vi.fn();
    const persons = [makePerson(1, 'Ada Lovelace')];
    render(<Sidebar persons={persons} selectedPerson={null} onSelectPerson={onSelectPerson} />, { wrapper });
    await userEvent.click(screen.getByTestId('person-item-1'));
    expect(onSelectPerson).toHaveBeenCalledWith(persons[0]);
  });

  it('Add button opens dialog', async () => {
    render(<Sidebar persons={[]} selectedPerson={null} onSelectPerson={vi.fn()} />, { wrapper });
    await userEvent.click(screen.getByTestId('add-person-button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add person')).toBeInTheDocument();
  });
});
