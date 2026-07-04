import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { TreeMemberGuard, RequireRoles } from '../trees/tree-member.guard';

@Controller('relationships')
@UseGuards(SupabaseAuthGuard, TreeMemberGuard)
export class RelationshipsController {
  constructor(@Inject(RelationshipsService) private readonly relationshipsService: RelationshipsService) {}

  @Get()
  @RequireRoles('viewer')
  findAll(@Query('treeId', ParseIntPipe) treeId: number) {
    return this.relationshipsService.findAll(treeId);
  }

  @Get('person/:personId')
  @RequireRoles('viewer')
  findByPerson(
    @Param('personId', ParseIntPipe) personId: number,
    @Query('treeId', ParseIntPipe) treeId: number,
  ) {
    return this.relationshipsService.findByPerson(personId, treeId);
  }

  @Post()
  @RequireRoles('editor')
  create(@Body() dto: CreateRelationshipDto) {
    return this.relationshipsService.create(dto);
  }

  @Delete(':id')
  @RequireRoles('editor')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Query('treeId', ParseIntPipe) treeId: number) {
    return this.relationshipsService.remove(id, treeId);
  }
}
