import {
  Controller, Get, Post, Delete, Param, ParseIntPipe, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { TreesService } from './trees.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('person-links')
@UseGuards(SupabaseAuthGuard)
export class PersonLinksController {
  constructor(private readonly treesService: TreesService) {}

  @Get('pending')
  listPending(@Req() req: Request & { user: { id: string } }) {
    return this.treesService.getPendingLinkRequests(req.user.id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.treesService.decidePersonLink(id, 'approve', req.user.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.treesService.decidePersonLink(id, 'reject', req.user.id);
  }

  @Delete(':id')
  unlink(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.treesService.unlinkPersonTree(id, req.user.id);
  }
}
