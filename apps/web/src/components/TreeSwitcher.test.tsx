import { render, screen } from '@testing-library/react';
import { TreeSwitcher } from './TreeSwitcher';
import { useTree } from '../contexts/TreeContext';
import type { FamilyTreeMembership } from '@wongsorn-labs/atlas-lineage-shared';

vi.mock('../contexts/TreeContext', () => ({ useTree: vi.fn() }));

vi.mock('./CreateTreeDialog', () => ({
  CreateTreeDialog: () => <div data-testid="create-tree-dialog" />,
}));
vi.mock('./InviteMemberDialog', () => ({
  InviteMemberDialog: ({ tree }: { tree: FamilyTreeMembership }) => (
    <div data-testid="invite-member-dialog" data-tree-id={tree.id} />
  ),
}));

const trees: FamilyTreeMembership[] = [
  { id: 1, name: 'Tree A', description: null, ownerId: '1', createdAt: '', updatedAt: '', role: 'owner' },
  { id: 2, name: 'Tree B', description: null, ownerId: '1', createdAt: '', updatedAt: '', role: 'viewer' },
];

describe('TreeSwitcher', () => {
  it('renders the tree select and create/invite affordances when a tree is selected', () => {
    vi.mocked(useTree).mockReturnValue({
      trees, currentTree: trees[0], currentTreeId: 1, isLoading: false, setCurrentTreeId: vi.fn(),
    });

    render(<TreeSwitcher />);

    expect(screen.getByTestId('tree-select')).toBeInTheDocument();
    expect(screen.getByTestId('create-tree-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('invite-member-dialog')).toHaveAttribute('data-tree-id', '1');
  });

  it('does not render the invite dialog when no tree is selected', () => {
    vi.mocked(useTree).mockReturnValue({
      trees: [], currentTree: null, currentTreeId: null, isLoading: false, setCurrentTreeId: vi.fn(),
    });

    render(<TreeSwitcher />);

    expect(screen.queryByTestId('invite-member-dialog')).not.toBeInTheDocument();
  });
});
