import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateTreeDialog } from './CreateTreeDialog';
import { useCreateTree } from '@/hooks/useTrees';
import { useTree } from '../contexts/TreeContext';

vi.mock('@/hooks/useTrees', () => ({ useCreateTree: vi.fn() }));
vi.mock('../contexts/TreeContext', () => ({ useTree: vi.fn() }));

describe('CreateTreeDialog', () => {
  const mutateAsync = vi.fn();
  const setCurrentTreeId = vi.fn();

  beforeEach(() => {
    mutateAsync.mockReset();
    setCurrentTreeId.mockReset();
    vi.mocked(useCreateTree).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useCreateTree>);
    vi.mocked(useTree).mockReturnValue({ setCurrentTreeId } as unknown as ReturnType<typeof useTree>);
  });

  it('opens the dialog and submits a new tree', async () => {
    mutateAsync.mockResolvedValue({ id: 7, name: 'New Tree', description: null, ownerId: '1', createdAt: '', updatedAt: '' });
    const user = userEvent.setup();
    render(<CreateTreeDialog />);

    await user.click(screen.getByTestId('create-tree-button'));
    await user.type(screen.getByTestId('tree-name-input'), 'New Tree');
    await user.click(screen.getByRole('button', { name: /create tree/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Tree' }));
      expect(setCurrentTreeId).toHaveBeenCalledWith(7);
    });
  });

  it('does not submit when name is empty', async () => {
    const user = userEvent.setup();
    render(<CreateTreeDialog />);

    await user.click(screen.getByTestId('create-tree-button'));
    await user.click(screen.getByRole('button', { name: /create tree/i }));

    await waitFor(() => {
      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });
});
