import { Test, TestingModule } from '@nestjs/testing';
import { PersonLinksController } from './person-links.controller';
import { TreesService } from './trees.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

const mockTreesService = {
  getPendingLinkRequests: jest.fn(),
  decidePersonLink: jest.fn(),
  unlinkPersonTree: jest.fn(),
};

describe('PersonLinksController', () => {
  let controller: PersonLinksController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonLinksController],
      providers: [{ provide: TreesService, useValue: mockTreesService }],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<PersonLinksController>(PersonLinksController);
  });

  it('listPending delegates to the service with the caller id', async () => {
    const mockReq = { user: { id: 'user-1' } } as any;
    mockTreesService.getPendingLinkRequests.mockResolvedValue([]);
    await controller.listPending(mockReq);
    expect(mockTreesService.getPendingLinkRequests).toHaveBeenCalledWith('user-1');
  });

  it('approve delegates to the service with decision "approve"', async () => {
    const mockReq = { user: { id: 'user-1' } } as any;
    mockTreesService.decidePersonLink.mockResolvedValue({ id: 10, status: 'approved' });
    const result = await controller.approve(10, mockReq);
    expect(mockTreesService.decidePersonLink).toHaveBeenCalledWith(10, 'approve', 'user-1');
    expect(result).toMatchObject({ status: 'approved' });
  });

  it('reject delegates to the service with decision "reject"', async () => {
    const mockReq = { user: { id: 'user-1' } } as any;
    mockTreesService.decidePersonLink.mockResolvedValue({ deleted: true });
    await controller.reject(10, mockReq);
    expect(mockTreesService.decidePersonLink).toHaveBeenCalledWith(10, 'reject', 'user-1');
  });

  it('unlink delegates to the service with the caller id', async () => {
    const mockReq = { user: { id: 'user-2' } } as any;
    mockTreesService.unlinkPersonTree.mockResolvedValue({ deleted: true });
    const result = await controller.unlink(10, mockReq);
    expect(mockTreesService.unlinkPersonTree).toHaveBeenCalledWith(10, 'user-2');
    expect(result).toEqual({ deleted: true });
  });
});
