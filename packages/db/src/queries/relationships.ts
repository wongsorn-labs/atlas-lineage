import { eq, or } from 'drizzle-orm';
import { db } from '../client';
import { relationships } from '../schema';
import type { Relationship, CreateRelationshipInput } from '@wongsorn-labs/atlas-lineage-shared';

function mapRelationship(row: typeof relationships.$inferSelect): Relationship {
  return {
    id: row.id,
    personId: row.personId,
    relatedPersonId: row.relatedPersonId,
    type: row.type as Relationship['type'],
    createdAt: row.createdAt ?? '',
  };
}

export function findAllRelationships(): Relationship[] {
  return db.select().from(relationships).all().map(mapRelationship);
}

export function findRelationshipsByPerson(personId: number): Relationship[] {
  return db
    .select()
    .from(relationships)
    .where(or(
      eq(relationships.personId, personId),
      eq(relationships.relatedPersonId, personId),
    ))
    .all()
    .map(mapRelationship);
}

export function createRelationship(input: CreateRelationshipInput): Relationship {
  const row = db
    .insert(relationships)
    .values({
      personId: input.personId,
      relatedPersonId: input.relatedPersonId,
      type: input.type,
    })
    .returning()
    .get();
  return mapRelationship(row);
}

export function deleteRelationship(id: number): boolean {
  const row = db.delete(relationships).where(eq(relationships.id, id)).returning().get();
  return !!row;
}
