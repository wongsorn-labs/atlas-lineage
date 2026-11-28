import { and, asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { knowledgePeriods } from '../schema';
import type { KnowledgePeriod } from '@wongsorn-labs/atlas-lineage-shared';

function mapPeriod(row: typeof knowledgePeriods.$inferSelect): KnowledgePeriod {
  return {
    id: row.id,
    treeId: row.treeId,
    personId: row.personId,
    groupName: row.groupName,
    fromYear: row.fromYear,
    toYear: row.toYear ?? null,
    createdAt: row.createdAt?.toISOString() ?? '',
  };
}

export async function findPeriods(treeId: number): Promise<KnowledgePeriod[]> {
  const rows = await db
    .select()
    .from(knowledgePeriods)
    .where(eq(knowledgePeriods.treeId, treeId))
    .orderBy(asc(knowledgePeriods.fromYear), asc(knowledgePeriods.id));
  return rows.map(mapPeriod);
}

export async function createPeriod(input: {
  treeId: number;
  personId: number;
  groupName: string;
  fromYear: number;
  toYear?: number | null;
}): Promise<KnowledgePeriod> {
  const [row] = await db
    .insert(knowledgePeriods)
    .values({
      treeId: input.treeId,
      personId: input.personId,
      groupName: input.groupName,
      fromYear: input.fromYear,
      toYear: input.toYear ?? null,
    })
    .returning();
  return mapPeriod(row);
}

export async function deletePeriod(id: number, treeId: number): Promise<boolean> {
  const [row] = await db
    .delete(knowledgePeriods)
    .where(and(eq(knowledgePeriods.id, id), eq(knowledgePeriods.treeId, treeId)))
    .returning();
  return !!row;
}
