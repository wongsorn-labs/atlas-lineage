import { Injectable, NotFoundException } from '@nestjs/common';
import {
  findAllPersons,
  findAllRelationships,
  findRelationshipsByPerson,
  findPersonById,
  createRelationship,
  deleteRelationship,
} from '@wongsorn-labs/atlas-lineage-db';
import type { CreateRelationshipDto } from './dto/create-relationship.dto';
import { buildHierarchy } from '@wongsorn-labs/atlas-lineage-shared';
import type { RelationshipType } from '@wongsorn-labs/atlas-lineage-shared';

@Injectable()
export class RelationshipsService {
  findAll(treeId: number) {
    return findAllRelationships(treeId);
  }

  findByPerson(personId: number, treeId: number) {
    return findRelationshipsByPerson(personId, treeId);
  }

  /** Kinship tree centred on `rootId`, with labels such as พ่อ, แม่, ปู่/ตา resolved from the stored sides. */
  async hierarchy(treeId: number, rootId: number) {
    const [people, relationships] = await Promise.all([findAllPersons(treeId), findAllRelationships(treeId)]);
    if (!people.some((p) => p.id === rootId)) throw new NotFoundException(`Person #${rootId} not found`);
    const byId = new Map(people.map((p) => [p.id, p]));
    const nodes = buildHierarchy(
      rootId,
      people.map((p) => ({ id: p.id, name: p.name, nickname: p.nickname, gender: p.gender })),
      relationships.map((r) => ({ personId: r.personId, relatedPersonId: r.relatedPersonId, type: r.type, side: r.side })),
    );
    return nodes.map((n) => {
      const person = byId.get(n.personId)!;
      return { ...n, name: person.name, nickname: person.nickname, photo: person.photo };
    });
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
      side: dto.side ?? null,
    });
  }

  async remove(id: number, treeId: number) {
    const deleted = await deleteRelationship(id, treeId);
    if (!deleted) throw new NotFoundException(`Relationship #${id} not found`);
    return { deleted: true };
  }
}
