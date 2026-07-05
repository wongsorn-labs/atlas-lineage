import { Test, TestingModule } from '@nestjs/testing';
import { TreesController } from './trees.controller';
import { TreesService } from './trees.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

const mockTreesService = {
  getTreesForUser: jest.fn(),
  createTree: jest.fn(),
  addMember: jest.fn(),
  getTree: jest.fn(),
  getMemberRole: jest.fn(),
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

  it('addMember delegates to the service', async () => {
    const body = { userId: 'user-2', role: 'editor' } as any;
    mockTreesService.addMember.mockResolvedValue({ id: 1, treeId: 5, userId: 'user-2', role: 'editor' });
    const result = await controller.addMember(5, body);
    expect(mockTreesService.addMember).toHaveBeenCalledWith(5, body);
    expect(result).toMatchObject({ userId: 'user-2', role: 'editor' });
  });
});
