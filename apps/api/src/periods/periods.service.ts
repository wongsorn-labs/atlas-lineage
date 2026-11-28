import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  findPeriods,
  createPeriod,
  deletePeriod,
  findPersonById,
} from '@wongsorn-labs/atlas-lineage-db';
import { CreatePeriodSchema } from '@wongsorn-labs/atlas-lineage-shared';
import type { CreatePeriodDto } from './dto/create-period.dto';

/** Shared schema check: group name, year range, and to-year not before from-year. */
export function parsePeriodInput(dto: CreatePeriodDto) {
  const result = CreatePeriodSchema.safeParse(dto);
  if (!result.success) throw new BadRequestException(result.error.issues[0]?.message ?? 'Invalid period');
  return result.data;
}

@Injectable()
export class PeriodsService {
  findAll(treeId: number) {
    return findPeriods(treeId);
  }

  async create(dto: CreatePeriodDto) {
    const input = parsePeriodInput(dto);
    const person = await findPersonById(input.personId, input.treeId);
    if (!person) throw new NotFoundException(`Person #${input.personId} not found`);
    return createPeriod({
      treeId: input.treeId,
      personId: input.personId,
      groupName: input.groupName,
      fromYear: input.fromYear,
      toYear: input.toYear ?? null,
    });
  }

  async remove(id: number, treeId: number) {
    const deleted = await deletePeriod(id, treeId);
    if (!deleted) throw new NotFoundException(`Period #${id} not found`);
    return { deleted: true };
  }
}
