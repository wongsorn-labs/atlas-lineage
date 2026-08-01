import { Test, TestingModule } from '@nestjs/testing';
import { TreesController } from './trees.controller';
import { TreesService } from './trees.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

const mockTreesService = {
  getTreesForUser: jest.fn(),
  createTree: jest.fn(),
  updateTree: jest.fn(),
  addMember: jest.fn(),
  getTree: jest.fn(),
  getMemberRole: jest.fn(),
  deleteTree: jest.fn(),
  restoreTree: jest.fn(),
  purgeTree: jest.fn(),
  getTrash: jest.fn(),
  requestPersonLink: jest.fn(),
  getLinkForPerson: jest.fn(),
};

describe('TreesController', () => {
  let controller: TreesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TreesController],
      providers: [{ provide: TreesService, useValue: mockTreesService }],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<TreesController>(TreesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listTrees calls service with userId from request', async () => {
    mockTreesService.getTreesForUser.mockResolvedValue([]);
    const mockReq = { user: { id: 'user-1' } } as any;
    const result = await controller.listTrees(mockReq);
    expect(mockTreesService.getTreesForUser).toHaveBeenCalledWith('user-1');
    expect(result).toEqual([]);
  });

  it('listTrees returns each tree with the caller\'s role included', async () => {
    const tree = {
      id: 1, name: 'Default Tree', description: null, ownerId: 'user-1',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', role: 'owner',
    };
    mockTreesService.getTreesForUser.mockResolvedValue([tree]);
    const mockReq = { user: { id: 'user-1' } } as any;
    const result = await controller.listTrees(mockReq);
    expect(result).toEqual([tree]);
  });

  it('updateTree delegates to the service', async () => {
    const body = { name: 'Renamed Tree' } as any;
    const updated = {
      id: 5, name: 'Renamed Tree', description: null, ownerId: 'user-1',
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z',
    };
    mockTreesService.updateTree.mockResolvedValue(updated);
    const result = await controller.updateTree(5, body);
    expect(mockTreesService.updateTree).toHaveBeenCalledWith(5, body);
    expect(result).toEqual(updated);
  });

  it('addMember delegates to the service', async () => {
    const body = { userId: 'user-2', role: 'editor' } as any;
    mockTreesService.addMember.mockResolvedValue({ id: 1, treeId: 5, userId: 'user-2', role: 'editor' });
    const result = await controller.addMember(5, body);
    expect(mockTreesService.addMember).toHaveBeenCalledWith(5, body);
    expect(result).toMatchObject({ userId: 'user-2', role: 'editor' });
  });

  it('deleteTree delegates to the service with the caller id', async () => {
    const mockReq = { user: { id: 'user-1' } } as any;
    mockTreesService.deleteTree.mockResolvedValue({ id: 5, deletedAt: '2024-06-01T00:00:00.000Z' });
    const result = await controller.deleteTree(5, mockReq);
    expect(mockTreesService.deleteTree).toHaveBeenCalledWith(5, 'user-1');
    expect(result).toMatchObject({ deletedAt: '2024-06-01T00:00:00.000Z' });
  });

  it('restoreTree delegates to the service with the caller id', async () => {
    const mockReq = { user: { id: 'user-1' } } as any;
    mockTreesService.restoreTree.mockResolvedValue({ id: 5, deletedAt: null });
    await controller.restoreTree(5, mockReq);
    expect(mockTreesService.restoreTree).toHaveBeenCalledWith(5, 'user-1');
  });

  it('purgeTree delegates to the service with the caller id', async () => {
    const mockReq = { user: { id: 'user-1' } } as any;
    mockTreesService.purgeTree.mockResolvedValue({ deleted: true });
    const result = await controller.purgeTree(5, mockReq);
    expect(mockTreesService.purgeTree).toHaveBeenCalledWith(5, 'user-1');
    expect(result).toEqual({ deleted: true });
  });

  it('listTrash delegates to the service with the caller id', async () => {
    const mockReq = { user: { id: 'user-1' } } as any;
    mockTreesService.getTrash.mockResolvedValue([]);
    await controller.listTrash(mockReq);
    expect(mockTreesService.getTrash).toHaveBeenCalledWith('user-1');
  });

  it('requestPersonLink delegates to the service scoped to the destination tree', async () => {
    const mockReq = { user: { id: 'user-1' } } as any;
    const body = { personId: 5 } as any;
    mockTreesService.requestPersonLink.mockResolvedValue({ id: 10, personId: 5, treeId: 3, status: 'pending' });
    await controller.requestPersonLink(3, body, mockReq);
    expect(mockTreesService.requestPersonLink).toHaveBeenCalledWith(3, { personId: 5, treeId: 3 }, 'user-1');
  });
});
