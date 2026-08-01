import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditTreeDialog } from './EditTreeDialog';
import { useUpdateTree, useDeleteTree } from '@/hooks/useTrees';
import type { FamilyTreeMembership } from '@wongsorn-labs/atlas-lineage-shared';

vi.mock('@/hooks/useTrees');

const ownerTree: FamilyTreeMembership = {
  id: 1, name: 'Default Tree', description: 'A test tree', ownerId: '1', createdAt: '', updatedAt: '', role: 'owner',
};
const editorTree: FamilyTreeMembership = { ...ownerTree, role: 'editor' };

describe('EditTreeDialog', () => {
  const mutateAsync = vi.fn();
  const deleteMutateAsync = vi.fn();

  beforeEach(() => {
    mutateAsync.mockReset();
    deleteMutateAsync.mockReset();
    vi.mocked(useUpdateTree).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useUpdateTree>);
    vi.mocked(useDeleteTree).mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false } as unknown as ReturnType<typeof useDeleteTree>);
  });

  it('renders nothing when the caller is not an owner', () => {
    const { container } = render(<EditTreeDialog tree={editorTree} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('pre-fills the form with the current tree details', async () => {
    const user = userEvent.setup();
    render(<EditTreeDialog tree={ownerTree} />);

    await user.click(screen.getByTestId('edit-tree-button'));

    expect(screen.getByTestId('edit-tree-name-input')).toHaveValue('Default Tree');
    expect(screen.getByTestId('edit-tree-description-input')).toHaveValue('A test tree');
  });

  it('submits updated details for an owner', async () => {
    mutateAsync.mockResolvedValue({ id: 1, name: 'Renamed Tree', description: 'A test tree', ownerId: '1', createdAt: '', updatedAt: '' });
    const user = userEvent.setup();
    render(<EditTreeDialog tree={ownerTree} />);

    await user.click(screen.getByTestId('edit-tree-button'));
    await user.clear(screen.getByTestId('edit-tree-name-input'));
    await user.type(screen.getByTestId('edit-tree-name-input'), 'Renamed Tree');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        treeId: 1,
        data: { name: 'Renamed Tree', description: 'A test tree' },
      });
    });
  });

  it('does not submit when name is cleared', async () => {
    const user = userEvent.setup();
    render(<EditTreeDialog tree={ownerTree} />);

    await user.click(screen.getByTestId('edit-tree-button'));
    await user.clear(screen.getByTestId('edit-tree-name-input'));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });
});
