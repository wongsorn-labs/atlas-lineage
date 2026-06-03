import { eq } from 'drizzle-orm';
import { db } from '../client';
import { relationships } from '../schema';
import type { Relationship, CreateRelationshipInput } from '@wongsorn-labs/atlas-lineage-shared';

function mapRelationship(row: typeof relationships.$inferSelect): Relationship {
  return {
    id: row.id,
    personId: row.personId,
    relatedPersonId: row.relatedPersonId,
    type: row.type as Relationship['type'],
    createdAt: row.createdAt?.toISOString() ?? '',
  };
}

export async function findAllRelationships(): Promise<Relationship[]> {
  const rows = await db.select().from(relationships);
  return rows.map(mapRelationship);
}

export async function findRelationshipsByPerson(personId: number): Promise<Relationship[]> {
  const rows = await db
    .select()
    .from(relationships)
    .where(eq(relationships.personId, personId));
  return rows.map(mapRelationship);
}

export async function createRelationship(input: CreateRelationshipInput): Promise<Relationship> {
  const [row] = await db
    .insert(relationships)
    .values({
      personId: input.personId,
      relatedPersonId: input.relatedPersonId,
      type: input.type,
    })
    .returning();
  return mapRelationship(row);
}

export async function deleteRelationship(id: number): Promise<boolean> {
  const [row] = await db.delete(relationships).where(eq(relationships.id, id)).returning();
  return !!row;
}
