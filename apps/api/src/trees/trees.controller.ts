import {
  Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { TreesService } from './trees.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { CreateTreeInput, AddTreeMemberInput } from '@wongsorn-labs/atlas-lineage-shared';

@Controller('trees')
@UseGuards(SupabaseAuthGuard)
export class TreesController {
  constructor(private readonly treesService: TreesService) {}

  @Get()
  listTrees(@Req() req: Request & { user: { id: string } }) {
    return this.treesService.getTreesForUser(req.user.id);
  }

  @Post()
  createTree(
    @Body() body: CreateTreeInput,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.treesService.createTree(body, req.user.id);
  }

  @Post(':treeId/members')
  addMember(
    @Param('treeId', ParseIntPipe) treeId: number,
    @Body() body: AddTreeMemberInput,
  ) {
    return this.treesService.addMember(treeId, body);
  }
}
