import {
  CanActivate, ExecutionContext, Injectable, BadRequestException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TreesService } from './trees.service';
import type { Request } from 'express';
import type { TreeRole } from '@wongsorn-labs/atlas-lineage-shared';

export const REQUIRED_ROLES_KEY = 'requiredRoles';

export const RequireRoles = (...roles: TreeRole[]) =>
  Reflect.metadata(REQUIRED_ROLES_KEY, roles);

@Injectable()
export class TreeMemberGuard implements CanActivate {
  constructor(
    private readonly treesService: TreesService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('No authenticated user');

    const treeId = Number(req.params.treeId ?? req.body?.treeId ?? req.query.treeId);
    if (!treeId || isNaN(treeId)) throw new BadRequestException('treeId is required');

    const role = await this.treesService.getMemberRole(treeId, userId);
    if (!role) throw new NotFoundException('Tree not found or no access');

    const required = this.reflector.get<TreeRole[]>(REQUIRED_ROLES_KEY, context.getHandler()) ?? [];
    if (required.length === 0) return true;

    const hierarchy: Record<TreeRole, number> = { owner: 3, editor: 2, viewer: 1 };
    const userLevel = hierarchy[role];
    const minRequired = Math.min(...required.map((r) => hierarchy[r]));
    if (userLevel < minRequired) throw new ForbiddenException('Insufficient role');

    return true;
  }
}
