import { Injectable, NotFoundException } from '@nestjs/common';
import {
  findFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
} from '@wongsorn-labs/atlas-lineage-db';
import type { CreateFieldDefinitionDto, UpdateFieldDefinitionDto } from './dto/field-definition.dto';

@Injectable()
export class FieldDefinitionsService {
  findAll(treeId: number) {
    return findFieldDefinitions(treeId);
  }

  create(treeId: number, dto: CreateFieldDefinitionDto, userId: string) {
    return createFieldDefinition({
      treeId,
      key: dto.key,
      label: dto.label,
      category: dto.category ?? 'general',
      valueType: dto.valueType ?? 'text',
      visibility: dto.visibility ?? 'members',
      createdBy: userId,
    });
  }

  async update(id: number, treeId: number, dto: UpdateFieldDefinitionDto) {
    const row = await updateFieldDefinition(id, treeId, dto);
    if (!row) throw new NotFoundException(`Field #${id} not found`);
    return row;
  }

  async remove(id: number, treeId: number) {
    const deleted = await deleteFieldDefinition(id, treeId);
    if (!deleted) throw new NotFoundException(`Field #${id} not found`);
    return { deleted: true };
  }
}
