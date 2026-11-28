import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { TreeMemberGuard, RequireRoles } from '../trees/tree-member.guard';

@Controller('periods')
@UseGuards(SupabaseAuthGuard, TreeMemberGuard)
export class PeriodsController {
  constructor(@Inject(PeriodsService) private readonly service: PeriodsService) {}

  @Get()
  @RequireRoles('viewer')
  findAll(@Query('treeId', ParseIntPipe) treeId: number) {
    return this.service.findAll(treeId);
  }

  @Post()
  @RequireRoles('editor')
  create(@Body() dto: CreatePeriodDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @RequireRoles('editor')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Query('treeId', ParseIntPipe) treeId: number) {
    return this.service.remove(id, treeId);
  }
}
