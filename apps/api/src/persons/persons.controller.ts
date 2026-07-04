import {
  Controller,
  Get,
  Post,
  Patch,
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
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { TreeMemberGuard, RequireRoles } from '../trees/tree-member.guard';

@Controller('persons')
@UseGuards(SupabaseAuthGuard, TreeMemberGuard)
export class PersonsController {
  constructor(@Inject(PersonsService) private readonly personsService: PersonsService) {}

  @Get()
  @RequireRoles('viewer')
  findAll(@Query('treeId', ParseIntPipe) treeId: number) {
    return this.personsService.findAll(treeId);
  }

  @Get(':id')
  @RequireRoles('viewer')
  findOne(@Param('id', ParseIntPipe) id: number, @Query('treeId', ParseIntPipe) treeId: number) {
    return this.personsService.findOne(id, treeId);
  }

  @Post()
  @RequireRoles('editor')
  create(@Body() dto: CreatePersonDto) {
    return this.personsService.create(dto);
  }

  @Patch(':id')
  @RequireRoles('editor')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Query('treeId', ParseIntPipe) treeId: number,
    @Body() dto: UpdatePersonDto,
  ) {
    return this.personsService.update(id, treeId, dto);
  }

  @Delete(':id')
  @RequireRoles('editor')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Query('treeId', ParseIntPipe) treeId: number) {
    return this.personsService.remove(id, treeId);
  }
}
