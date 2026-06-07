import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
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

@Controller('relationships')
@UseGuards(SupabaseAuthGuard)
export class RelationshipsController {
  constructor(@Inject(RelationshipsService) private readonly relationshipsService: RelationshipsService) {}

  @Get()
  findAll() {
    return this.relationshipsService.findAll();
  }

  @Get('person/:personId')
  findByPerson(@Param('personId', ParseIntPipe) personId: number) {
    return this.relationshipsService.findByPerson(personId);
  }

  @Post()
  create(@Body() dto: CreateRelationshipDto) {
    return this.relationshipsService.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.relationshipsService.remove(id);
  }
}
