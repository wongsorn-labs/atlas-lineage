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
  findAll() {
    return findAllPersons();
  }

  async findOne(id: number) {
    const person = await findPersonById(id);
    if (!person) throw new NotFoundException(`Person #${id} not found`);
    return person;
  }

  create(dto: CreatePersonDto) {
    return createPerson(dto);
  }

  async update(id: number, dto: UpdatePersonDto) {
    const person = await updatePerson(id, dto);
    if (!person) throw new NotFoundException(`Person #${id} not found`);
    return person;
  }

  async remove(id: number) {
    const deleted = await deletePerson(id);
    if (!deleted) throw new NotFoundException(`Person #${id} not found`);
    return { deleted: true };
  }
}
