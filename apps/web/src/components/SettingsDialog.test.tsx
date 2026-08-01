import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsDialog } from './SettingsDialog';

const { useAuth, useTree, useTheme } = vi.hoisted(() => ({
  useAuth: vi.fn(), useTree: vi.fn(), useTheme: vi.fn(),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../contexts/TreeContext', () => ({ useTree }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme }));

const setPrimaryTree = vi.fn();
const updateDefaultCountry = vi.fn();

function mockContexts({ currentTreeId, primaryTreeId }: { currentTreeId: number | null; primaryTreeId: number | null }) {
  useAuth.mockReturnValue({
    user: { id: 'user-1', email: 'a@example.com', defaultCountry: null, primaryTreeId },
    updateDefaultCountry,
    setPrimaryTree,
  });
  useTree.mockReturnValue({
    currentTreeId,
    trees: [], currentTree: null, isLoading: false, setCurrentTreeId: vi.fn(),
  });
  useTheme.mockReturnValue({ theme: 'light', toggleTheme: vi.fn(), setTheme: vi.fn() });
}

describe('SettingsDialog', () => {
  beforeEach(() => {
    setPrimaryTree.mockReset();
    updateDefaultCountry.mockReset();
  });

  it('shows a "set as primary" button when the current tree is not primary', async () => {
    mockContexts({ currentTreeId: 5, primaryTreeId: 6 });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.click(screen.getByTestId('settings-button'));

    expect(screen.getByTestId('set-primary-tree-button')).toBeInTheDocument();
    expect(screen.queryByTestId('primary-tree-current')).not.toBeInTheDocument();
  });

  it('shows the "current primary" label instead of a button when already primary', async () => {
    mockContexts({ currentTreeId: 5, primaryTreeId: 5 });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.click(screen.getByTestId('settings-button'));

    expect(screen.getByTestId('primary-tree-current')).toBeInTheDocument();
    expect(screen.queryByTestId('set-primary-tree-button')).not.toBeInTheDocument();
  });

  it('calls setPrimaryTree with the current tree id when clicked', async () => {
    mockContexts({ currentTreeId: 5, primaryTreeId: 6 });
    const user = userEvent.setup();
    render(<SettingsDialog />);

    await user.click(screen.getByTestId('settings-button'));
    await user.click(screen.getByTestId('set-primary-tree-button'));

    expect(setPrimaryTree).toHaveBeenCalledWith(5);
  });
});
