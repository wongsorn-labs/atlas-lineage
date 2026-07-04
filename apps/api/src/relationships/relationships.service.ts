import { Injectable, NotFoundException } from '@nestjs/common';
import {
  findAllRelationships,
  findRelationshipsByPerson,
  findPersonById,
  createRelationship,
  deleteRelationship,
} from '@wongsorn-labs/atlas-lineage-db';
import type { CreateRelationshipDto } from './dto/create-relationship.dto';
import type { RelationshipType } from '@wongsorn-labs/atlas-lineage-shared';

@Injectable()
export class RelationshipsService {
  findAll(treeId: number) {
    return findAllRelationships(treeId);
  }

  findByPerson(personId: number, treeId: number) {
    return findRelationshipsByPerson(personId, treeId);
  }

  async create(dto: CreateRelationshipDto) {
    const [person, relatedPerson] = await Promise.all([
      findPersonById(dto.personId, dto.treeId),
      findPersonById(dto.relatedPersonId, dto.treeId),
    ]);
    if (!person) throw new NotFoundException(`Person #${dto.personId} not found`);
    if (!relatedPerson) throw new NotFoundException(`Person #${dto.relatedPersonId} not found`);

    return createRelationship({
      treeId: dto.treeId,
      personId: dto.personId,
      relatedPersonId: dto.relatedPersonId,
      type: dto.type as RelationshipType,
    });
  }

  async remove(id: number, treeId: number) {
    const deleted = await deleteRelationship(id, treeId);
    if (!deleted) throw new NotFoundException(`Relationship #${id} not found`);
    return { deleted: true };
  }
}
