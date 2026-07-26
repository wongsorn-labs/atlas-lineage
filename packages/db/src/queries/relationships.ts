import { and, eq, or } from 'drizzle-orm';
import { db } from '../client';
import { relationships } from '../schema';
import type { Relationship, CreateRelationshipInput } from '@wongsorn-labs/atlas-lineage-shared';

function mapRelationship(row: typeof relationships.$inferSelect): Relationship {
  return {
    id: row.id,
    treeId: row.treeId,
    personId: row.personId,
    relatedPersonId: row.relatedPersonId,
    type: row.type as Relationship['type'],
    createdAt: row.createdAt?.toISOString() ?? '',
  };
}

export async function findAllRelationships(treeId: number): Promise<Relationship[]> {
  const rows = await db.select().from(relationships).where(eq(relationships.treeId, treeId));
  return rows.map(mapRelationship);
}

export async function findRelationshipsByPerson(personId: number, treeId: number): Promise<Relationship[]> {
  const rows = await db
    .select()
    .from(relationships)
    .where(and(
      eq(relationships.treeId, treeId),
      or(
        eq(relationships.personId, personId),
        eq(relationships.relatedPersonId, personId),
      ),
    ));
  return rows.map(mapRelationship);
}

export async function createRelationship(input: CreateRelationshipInput): Promise<Relationship> {
  const [row] = await db
    .insert(relationships)
    .values({
      treeId: input.treeId,
      personId: input.personId,
      relatedPersonId: input.relatedPersonId,
      type: input.type,
    })
    .returning();
  return mapRelationship(row);
}

export async function deleteRelationship(id: number, treeId: number): Promise<boolean> {
  const [row] = await db
    .delete(relationships)
    .where(and(eq(relationships.id, id), eq(relationships.treeId, treeId)))
    .returning();
  return !!row;
}
