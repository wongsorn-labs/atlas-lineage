import 'reflect-metadata';
import { ExecutionContext, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TreeMemberGuard } from './tree-member.guard';
import { TreesService } from './trees.service';
import type { TreeRole } from '@wongsorn-labs/atlas-lineage-shared';

function makeContext(req: Record<string, unknown>, requiredRoles?: TreeRole[]): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => (requiredRoles as unknown as () => void),
  } as unknown as ExecutionContext;
}

describe('TreeMemberGuard', () => {
  let treesService: { getMemberRole: jest.Mock };
  let reflector: { get: jest.Mock };
  let guard: TreeMemberGuard;

  beforeEach(() => {
    treesService = { getMemberRole: jest.fn() };
    reflector = { get: jest.fn() };
    guard = new TreeMemberGuard(treesService as unknown as TreesService, reflector as unknown as Reflector);
  });

  it('throws ForbiddenException when there is no authenticated user', async () => {
    const ctx = makeContext({ params: {}, query: {}, body: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when no treeId can be resolved', async () => {
    const ctx = makeContext({ user: { id: 'user-1' }, params: {}, query: {}, body: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when the user has no membership on the tree', async () => {
    treesService.getMemberRole.mockResolvedValue(null);
    const ctx = makeContext({ user: { id: 'user-1' }, params: {}, query: { treeId: '5' }, body: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
  });

  it('allows access when no roles are required and the user is any member', async () => {
    treesService.getMemberRole.mockResolvedValue('viewer');
    reflector.get.mockReturnValue(undefined);
    const ctx = makeContext({ user: { id: 'user-1' }, params: {}, query: { treeId: '5' }, body: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('throws ForbiddenException when the member role is below the required role', async () => {
    treesService.getMemberRole.mockResolvedValue('viewer');
    reflector.get.mockReturnValue(['editor']);
    const ctx = makeContext({ user: { id: 'user-1' }, params: {}, query: { treeId: '5' }, body: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows access when the member role meets the required role', async () => {
    treesService.getMemberRole.mockResolvedValue('editor');
    reflector.get.mockReturnValue(['editor']);
    const ctx = makeContext({ user: { id: 'user-1' }, params: {}, query: { treeId: '5' }, body: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('resolves treeId from route params over query and body', async () => {
    treesService.getMemberRole.mockResolvedValue('owner');
    reflector.get.mockReturnValue(undefined);
    const ctx = makeContext({ user: { id: 'user-1' }, params: { treeId: '7' }, query: { treeId: '999' }, body: {} });
    await guard.canActivate(ctx);
    expect(treesService.getMemberRole).toHaveBeenCalledWith(7, 'user-1');
  });
});
