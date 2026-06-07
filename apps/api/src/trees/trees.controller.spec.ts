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
});
