import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteMemberDialog } from './InviteMemberDialog';
import { useAddTreeMember } from '@/hooks/useTrees';
import type { FamilyTreeMembership } from '@wongsorn-labs/atlas-lineage-shared';

vi.mock('@/hooks/useTrees');

const ownerTree: FamilyTreeMembership = {
  id: 1, name: 'Default Tree', description: null, ownerId: '1', createdAt: '', updatedAt: '', role: 'owner',
};
const viewerTree: FamilyTreeMembership = { ...ownerTree, role: 'viewer' };

describe('InviteMemberDialog', () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    mutateAsync.mockReset();
    vi.mocked(useAddTreeMember).mockReturnValue({ mutateAsync, isPending: false } as unknown as ReturnType<typeof useAddTreeMember>);
  });

  it('renders nothing when the caller is not an owner', () => {
    const { container } = render(<InviteMemberDialog tree={viewerTree} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('submits a valid invite for an owner', async () => {
    mutateAsync.mockResolvedValue({ id: 2, treeId: 1, userId: '11111111-1111-1111-1111-111111111111', role: 'viewer', createdAt: '' });
    const user = userEvent.setup();
    render(<InviteMemberDialog tree={ownerTree} />);

    await user.click(screen.getByTestId('invite-member-button'));
    await user.type(screen.getByTestId('invite-user-id-input'), '11111111-1111-1111-1111-111111111111');
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        treeId: 1,
        data: { userId: '11111111-1111-1111-1111-111111111111', role: 'viewer' },
      });
      expect(screen.getByTestId('invite-success')).toBeInTheDocument();
    });
  });

  it('shows a validation error for an invalid user id', async () => {
    const user = userEvent.setup();
    render(<InviteMemberDialog tree={ownerTree} />);

    await user.click(screen.getByTestId('invite-member-button'));
    await user.type(screen.getByTestId('invite-user-id-input'), 'not-a-uuid');
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });
});
