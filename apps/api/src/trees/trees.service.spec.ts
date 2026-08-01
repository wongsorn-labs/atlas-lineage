import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TreesService } from './trees.service';

const mockTree = {
  id: 1, name: 'Family Tree', description: null, ownerId: 'user-1', deletedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
};

jest.mock('@wongsorn-labs/atlas-lineage-db', () => ({
  findTreesByUser: jest.fn(() => []),
  findTreeById: jest.fn((id: number) => (id === 1 ? mockTree : null)),
  createTree: jest.fn((input: unknown) => ({ ...mockTree, ...(input as object) })),
  updateTree: jest.fn((id: number, input: unknown) => (id === 1 ? { ...mockTree, ...(input as object) } : null)),
  addTreeMember: jest.fn(),
  findMemberRole: jest.fn(),
  softDeleteTree: jest.fn((treeId: number) => (treeId === 1 ? { ...mockTree, deletedAt: '2024-06-01T00:00:00.000Z' } : null)),
  restoreTree: jest.fn((treeId: number) => (treeId === 1 ? mockTree : null)),
  purgeTree: jest.fn((treeId: number) => treeId === 1),
  findTrashedTreesByOwner: jest.fn(() => [{ ...mockTree, deletedAt: '2024-06-01T00:00:00.000Z' }]),
  requestPersonLink: jest.fn(),
  findPersonTreeLinkById: jest.fn(),
  getPersonOriginTreeId: jest.fn(),
  findLinkByPersonAndTree: jest.fn(),
  approvePersonLink: jest.fn(),
  rejectPersonLink: jest.fn(),
  unlinkPersonTree: jest.fn(),
  findPendingLinkRequestsForOriginOwner: jest.fn(() => []),
}));

const db = jest.requireMock('@wongsorn-labs/atlas-lineage-db') as Record<string, jest.Mock>;

describe('TreesService', () => {
  let service: TreesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TreesService],
    }).compile();
    service = module.get<TreesService>(TreesService);
  });

  it('updateTree returns updated tree', async () => {
    const input = { name: 'Renamed Tree' };
    await expect(service.updateTree(1, input)).resolves.toMatchObject({ id: 1, name: 'Renamed Tree' });
  });

  it('updateTree throws NotFoundException when not found', async () => {
    await expect(service.updateTree(99, { name: 'X' })).rejects.toThrow(NotFoundException);
  });

  describe('deleteTree / restoreTree / purgeTree', () => {
    it('deleteTree returns the soft-deleted tree', async () => {
      await expect(service.deleteTree(1, 'user-1')).resolves.toMatchObject({ deletedAt: '2024-06-01T00:00:00.000Z' });
    });

    it('deleteTree throws NotFoundException when softDeleteTree resolves null', async () => {
      await expect(service.deleteTree(99, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('restoreTree throws NotFoundException when restoreTree resolves null', async () => {
      await expect(service.restoreTree(99, 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('purgeTree returns deleted:true on success', async () => {
      await expect(service.purgeTree(1, 'user-1')).resolves.toEqual({ deleted: true });
    });

    it('purgeTree throws NotFoundException on failure', async () => {
      await expect(service.purgeTree(99, 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('getTrash delegates to findTrashedTreesByOwner', () => {
      expect(service.getTrash('user-1')).toHaveLength(1);
    });
  });

  describe('requestPersonLink', () => {
    it('returns the created link on success', async () => {
      db.requestPersonLink.mockResolvedValue({ ok: true, link: { id: 10, personId: 5, treeId: 2, status: 'pending' } });
      await expect(service.requestPersonLink(2, { personId: 5, treeId: 2 }, 'user-2'))
        .resolves.toMatchObject({ status: 'pending' });
    });

    it('throws NotFoundException when the person does not exist', async () => {
      db.requestPersonLink.mockResolvedValue({ ok: false, reason: 'person_not_found' });
      await expect(service.requestPersonLink(2, { personId: 999, treeId: 2 }, 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for a duplicate or self-link request', async () => {
      db.requestPersonLink.mockResolvedValue({ ok: false, reason: 'link_already_exists' });
      await expect(service.requestPersonLink(2, { personId: 5, treeId: 2 }, 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('decidePersonLink', () => {
    const pendingLink = { id: 10, personId: 5, treeId: 2, status: 'pending', requestedBy: 'user-2', createdAt: '', decidedAt: null };

    it('throws NotFoundException when the link is not pending', async () => {
      db.findPersonTreeLinkById.mockResolvedValue({ ...pendingLink, status: 'approved' });
      await expect(service.decidePersonLink(10, 'approve', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the caller does not own the origin tree', async () => {
      db.findPersonTreeLinkById.mockResolvedValue(pendingLink);
      db.getPersonOriginTreeId.mockResolvedValue(1);
      db.findMemberRole.mockResolvedValue('editor');
      await expect(service.decidePersonLink(10, 'approve', 'user-3')).rejects.toThrow(ForbiddenException);
    });

    it('approves when the caller owns the origin tree', async () => {
      db.findPersonTreeLinkById.mockResolvedValue(pendingLink);
      db.getPersonOriginTreeId.mockResolvedValue(1);
      db.findMemberRole.mockResolvedValue('owner');
      db.approvePersonLink.mockResolvedValue({ ...pendingLink, status: 'approved' });
      await expect(service.decidePersonLink(10, 'approve', 'user-1')).resolves.toMatchObject({ status: 'approved' });
    });

    it('rejects when the caller owns the origin tree', async () => {
      db.findPersonTreeLinkById.mockResolvedValue(pendingLink);
      db.getPersonOriginTreeId.mockResolvedValue(1);
      db.findMemberRole.mockResolvedValue('owner');
      await expect(service.decidePersonLink(10, 'reject', 'user-1')).resolves.toEqual({ deleted: true });
      expect(db.rejectPersonLink).toHaveBeenCalledWith(10);
    });
  });

  describe('unlinkPersonTree', () => {
    const link = { id: 10, personId: 5, treeId: 2, status: 'approved', requestedBy: 'user-2', createdAt: '', decidedAt: '' };

    it('allows the destination tree owner to unlink', async () => {
      db.findPersonTreeLinkById.mockResolvedValue(link);
      db.getPersonOriginTreeId.mockResolvedValue(1);
      db.findMemberRole.mockImplementation((treeId: number, userId: string) =>
        (treeId === 2 && userId === 'user-2' ? 'owner' : null));
      db.unlinkPersonTree.mockResolvedValue(true);
      await expect(service.unlinkPersonTree(10, 'user-2')).resolves.toEqual({ deleted: true });
    });

    it('allows the origin tree owner to unlink', async () => {
      db.findPersonTreeLinkById.mockResolvedValue(link);
      db.getPersonOriginTreeId.mockResolvedValue(1);
      db.findMemberRole.mockImplementation((treeId: number, userId: string) =>
        (treeId === 1 && userId === 'user-1' ? 'owner' : null));
      db.unlinkPersonTree.mockResolvedValue(true);
      await expect(service.unlinkPersonTree(10, 'user-1')).resolves.toEqual({ deleted: true });
    });

    it('throws ForbiddenException for a caller who owns neither side', async () => {
      db.findPersonTreeLinkById.mockResolvedValue(link);
      db.getPersonOriginTreeId.mockResolvedValue(1);
      db.findMemberRole.mockResolvedValue(null);
      await expect(service.unlinkPersonTree(10, 'user-9')).rejects.toThrow(ForbiddenException);
    });
  });
});
