import { Injectable, NotFoundException } from '@nestjs/common';
import {
  findAllRelationships,
  findRelationshipsByPerson,
  createRelationship,
  deleteRelationship,
} from '@wongsorn-labs/atlas-lineage-db';
import type { CreateRelationshipDto } from './dto/create-relationship.dto';
import type { RelationshipType } from '@wongsorn-labs/atlas-lineage-shared';

@Injectable()
export class RelationshipsService {
  findAll() {
    return findAllRelationships();
  }

  findByPerson(personId: number) {
    return findRelationshipsByPerson(personId);
  }

  create(dto: CreateRelationshipDto) {
    return createRelationship({
      personId: dto.personId,
      relatedPersonId: dto.relatedPersonId,
      type: dto.type as RelationshipType,
    });
  }

  remove(id: number) {
    const deleted = deleteRelationship(id);
    if (!deleted) throw new NotFoundException(`Relationship #${id} not found`);
    return { deleted: true };
  }
}
