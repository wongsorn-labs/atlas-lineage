import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrashDialog } from './TrashDialog';
import { useTrashedTrees, useRestoreTree, usePurgeTree } from '@/hooks/useTrees';

vi.mock('@/hooks/useTrees');

const restoreMutate = vi.fn();
const purgeMutate = vi.fn();

describe('TrashDialog', () => {
  beforeEach(() => {
    restoreMutate.mockReset();
    purgeMutate.mockReset();
    vi.mocked(useRestoreTree).mockReturnValue({ mutate: restoreMutate, isPending: false } as unknown as ReturnType<typeof useRestoreTree>);
    vi.mocked(usePurgeTree).mockReturnValue({ mutate: purgeMutate, isPending: false } as unknown as ReturnType<typeof usePurgeTree>);
  });

  it('shows an empty state when there is nothing in the trash', async () => {
    vi.mocked(useTrashedTrees).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useTrashedTrees>);
    const user = userEvent.setup();
    render(<TrashDialog />);

    await user.click(screen.getByTestId('trash-button'));

    expect(screen.getByTestId('trash-empty')).toBeInTheDocument();
  });

  it('lists soft-deleted trees with restore and purge actions', async () => {
    vi.mocked(useTrashedTrees).mockReturnValue({
      data: [{ id: 1, name: 'Old Tree', description: null, ownerId: 'user-1', deletedAt: '2024-06-01T00:00:00.000Z', createdAt: '', updatedAt: '' }],
    } as unknown as ReturnType<typeof useTrashedTrees>);
    const user = userEvent.setup();
    render(<TrashDialog />);

    await user.click(screen.getByTestId('trash-button'));

    expect(screen.getByText('Old Tree')).toBeInTheDocument();
    expect(screen.getByTestId('restore-tree-button')).toBeInTheDocument();
    expect(screen.getByTestId('purge-tree-button')).toBeInTheDocument();
  });

  it('restores a tree immediately without a confirmation step', async () => {
    vi.mocked(useTrashedTrees).mockReturnValue({
      data: [{ id: 1, name: 'Old Tree', description: null, ownerId: 'user-1', deletedAt: '2024-06-01T00:00:00.000Z', createdAt: '', updatedAt: '' }],
    } as unknown as ReturnType<typeof useTrashedTrees>);
    const user = userEvent.setup();
    render(<TrashDialog />);

    await user.click(screen.getByTestId('trash-button'));
    await user.click(screen.getByTestId('restore-tree-button'));

    expect(restoreMutate).toHaveBeenCalledWith(1);
  });

  it('requires confirmation before permanently deleting a tree', async () => {
    vi.mocked(useTrashedTrees).mockReturnValue({
      data: [{ id: 1, name: 'Old Tree', description: null, ownerId: 'user-1', deletedAt: '2024-06-01T00:00:00.000Z', createdAt: '', updatedAt: '' }],
    } as unknown as ReturnType<typeof useTrashedTrees>);
    const user = userEvent.setup();
    render(<TrashDialog />);

    await user.click(screen.getByTestId('trash-button'));
    await user.click(screen.getByTestId('purge-tree-button'));
    expect(purgeMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /delete forever/i }));
    expect(purgeMutate).toHaveBeenCalledWith(1);
  });
});
