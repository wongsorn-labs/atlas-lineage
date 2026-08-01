import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { TreesService } from './trees.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { TreeMemberGuard, RequireRoles } from './tree-member.guard';
import { UpdateTreeDto } from './dto/update-tree.dto';
import { RequestPersonLinkDto } from './dto/request-person-link.dto';
import type { CreateTreeInput, AddTreeMemberInput } from '@wongsorn-labs/atlas-lineage-shared';

@Controller('trees')
@UseGuards(SupabaseAuthGuard)
export class TreesController {
  constructor(private readonly treesService: TreesService) {}

  @Get()
  listTrees(@Req() req: Request & { user: { id: string } }) {
    return this.treesService.getTreesForUser(req.user.id);
  }

  @Get('trash')
  listTrash(@Req() req: Request & { user: { id: string } }) {
    return this.treesService.getTrash(req.user.id);
  }

  @Post()
  createTree(
    @Body() body: CreateTreeInput,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.treesService.createTree(body, req.user.id);
  }

  @Patch(':treeId')
  @UseGuards(TreeMemberGuard)
  @RequireRoles('owner')
  updateTree(
    @Param('treeId', ParseIntPipe) treeId: number,
    @Body() body: UpdateTreeDto,
  ) {
    return this.treesService.updateTree(treeId, body);
  }

  @Delete(':treeId')
  @UseGuards(TreeMemberGuard)
  @RequireRoles('owner')
  deleteTree(
    @Param('treeId', ParseIntPipe) treeId: number,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.treesService.deleteTree(treeId, req.user.id);
  }

  @Post(':treeId/restore')
  restoreTree(
    @Param('treeId', ParseIntPipe) treeId: number,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.treesService.restoreTree(treeId, req.user.id);
  }

  @Delete(':treeId/purge')
  purgeTree(
    @Param('treeId', ParseIntPipe) treeId: number,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.treesService.purgeTree(treeId, req.user.id);
  }

  @Post(':treeId/members')
  @UseGuards(TreeMemberGuard)
  @RequireRoles('owner')
  addMember(
    @Param('treeId', ParseIntPipe) treeId: number,
    @Body() body: AddTreeMemberInput,
  ) {
    return this.treesService.addMember(treeId, body);
  }

  @Post(':treeId/person-links')
  @UseGuards(TreeMemberGuard)
  @RequireRoles('owner')
  requestPersonLink(
    @Param('treeId', ParseIntPipe) treeId: number,
    @Body() body: RequestPersonLinkDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.treesService.requestPersonLink(treeId, { personId: body.personId, treeId }, req.user.id);
  }

  @Get(':treeId/person-links/:personId')
  @UseGuards(TreeMemberGuard)
  @RequireRoles('viewer')
  getPersonLink(
    @Param('treeId', ParseIntPipe) treeId: number,
    @Param('personId', ParseIntPipe) personId: number,
  ) {
    return this.treesService.getLinkForPerson(treeId, personId);
  }
}
