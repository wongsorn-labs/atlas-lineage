import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  findAllPersons,
  findPersonById,
  createPerson,
  updatePerson,
  deletePerson,
  findFieldDefinitions,
} from '@wongsorn-labs/atlas-lineage-db';
import type { FieldDefinition, Person, TreeRole } from '@wongsorn-labs/atlas-lineage-shared';
import type { CreatePersonDto } from './dto/create-person.dto';
import type { UpdatePersonDto } from './dto/update-person.dto';
import { validateAttributes, filterAttributesForRole } from '../field-definitions/field-attributes';

@Injectable()
export class PersonsService {
  async findAll(treeId: number, role?: TreeRole) {
    const people = await findAllPersons(treeId);
    return this.applyVisibility(people, role);
  }

  async findOne(id: number, treeId: number, role?: TreeRole) {
    const person = await findPersonById(id, treeId);
    if (!person) throw new NotFoundException(`Person #${id} not found`);
    const [shaped] = await this.applyVisibility([person], role);
    return shaped;
  }

  async create(dto: CreatePersonDto) {
    const attributes = dto.attributes
      ? validateAttributes(dto.attributes, await findFieldDefinitions(dto.treeId))
      : undefined;
    return createPerson({ ...dto, attributes });
  }

  async update(id: number, treeId: number, dto: UpdatePersonDto) {
    await this.assertWritable(id, treeId);
    const attributes = dto.attributes
      ? validateAttributes(dto.attributes, await findFieldDefinitions(treeId))
      : undefined;
    const person = await updatePerson(id, treeId, { ...dto, attributes });
    if (!person) throw new NotFoundException(`Person #${id} not found`);
    return person;
  }

  async remove(id: number, treeId: number) {
    await this.assertWritable(id, treeId);
    const deleted = await deletePerson(id, treeId);
    if (!deleted) throw new NotFoundException(`Person #${id} not found`);
    return { deleted: true };
  }

  /** Hides restricted attribute values from viewers. Definitions are loaded only when a viewer needs them. */
  private async applyVisibility(people: Person[], role?: TreeRole): Promise<Person[]> {
    if (role !== 'viewer') return people;
    const defsByTree = new Map<number, FieldDefinition[]>();
    for (const p of people) {
      if (!defsByTree.has(p.treeId)) defsByTree.set(p.treeId, await findFieldDefinitions(p.treeId));
    }
    return people.map((p) => ({
      ...p,
      attributes: filterAttributesForRole(p.attributes, defsByTree.get(p.treeId) ?? [], role),
    }));
  }

  /** A person visible to `treeId` only via a cross-tree link is read-only from that tree. */
  private async assertWritable(id: number, treeId: number) {
    const person = await findPersonById(id, treeId);
    if (!person) throw new NotFoundException(`Person #${id} not found`);
    if (person.treeId !== treeId) throw new ForbiddenException('Only the origin tree can edit this person');
  }
}
