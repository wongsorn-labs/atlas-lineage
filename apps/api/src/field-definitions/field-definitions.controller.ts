import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { FieldDefinitionsService } from './field-definitions.service';
import { CreateFieldDefinitionDto, UpdateFieldDefinitionDto } from './dto/field-definition.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { TreeMemberGuard, RequireRoles } from '../trees/tree-member.guard';

@Controller('field-definitions')
@UseGuards(SupabaseAuthGuard, TreeMemberGuard)
export class FieldDefinitionsController {
  constructor(@Inject(FieldDefinitionsService) private readonly service: FieldDefinitionsService) {}

  @Get()
  @RequireRoles('viewer')
  findAll(@Query('treeId', ParseIntPipe) treeId: number) {
    return this.service.findAll(treeId);
  }

  // Only the tree owner (group admin) may change the field schema.
  @Post()
  @RequireRoles('owner')
  create(
    @Query('treeId', ParseIntPipe) treeId: number,
    @Body() dto: CreateFieldDefinitionDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.service.create(treeId, dto, req.user.id);
  }

  @Patch(':id')
  @RequireRoles('owner')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Query('treeId', ParseIntPipe) treeId: number,
    @Body() dto: UpdateFieldDefinitionDto,
  ) {
    return this.service.update(id, treeId, dto);
  }

  @Delete(':id')
  @RequireRoles('owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Query('treeId', ParseIntPipe) treeId: number) {
    return this.service.remove(id, treeId);
  }
}
