import { Injectable, NotFoundException } from '@nestjs/common';
import {
  findAllPersons,
  findPersonById,
  createPerson,
  updatePerson,
  deletePerson,
} from '@wongsorn-labs/atlas-lineage-db';
import type { CreatePersonDto } from './dto/create-person.dto';
import type { UpdatePersonDto } from './dto/update-person.dto';

@Injectable()
export class PersonsService {
  findAll(treeId: number) {
    return findAllPersons(treeId);
  }

  async findOne(id: number, treeId: number) {
    const person = await findPersonById(id, treeId);
    if (!person) throw new NotFoundException(`Person #${id} not found`);
    return person;
  }

  create(dto: CreatePersonDto) {
    return createPerson(dto);
  }

  async update(id: number, treeId: number, dto: UpdatePersonDto) {
    const person = await updatePerson(id, treeId, dto);
    if (!person) throw new NotFoundException(`Person #${id} not found`);
    return person;
  }

  async remove(id: number, treeId: number) {
    const deleted = await deletePerson(id, treeId);
    if (!deleted) throw new NotFoundException(`Person #${id} not found`);
    return { deleted: true };
  }
}
