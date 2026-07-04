import { and, eq } from 'drizzle-orm';
import { db } from '../client';
import { persons } from '../schema';
import { encryptField, decryptField } from '../crypto';
import type { Person, CreatePersonInput, UpdatePersonInput } from '@wongsorn-labs/atlas-lineage-shared';

function getKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY env var is required');
  return key;
}

function mapPerson(row: typeof persons.$inferSelect): Person {
  const key = getKey();
  return {
    id: row.id,
    treeId: row.treeId,
    name: row.name,
    birthYear: row.birthYear ?? null,
    deathYear: row.deathYear ?? null,
    birthLat: row.birthLat ?? null,
    birthLng: row.birthLng ?? null,
    birthPlace: decryptField(row.birthPlace, key),
    notes: decryptField(row.notes, key),
    createdAt: row.createdAt?.toISOString() ?? '',
    updatedAt: row.updatedAt?.toISOString() ?? '',
  };
}

export async function findAllPersons(treeId: number): Promise<Person[]> {
  const rows = await db.select().from(persons).where(eq(persons.treeId, treeId));
  return rows.map(mapPerson);
}

export async function findPersonById(id: number, treeId: number): Promise<Person | null> {
  const [row] = await db
    .select()
    .from(persons)
    .where(and(eq(persons.id, id), eq(persons.treeId, treeId)))
    .limit(1);
  return row ? mapPerson(row) : null;
}

export async function createPerson(input: CreatePersonInput): Promise<Person> {
  const key = getKey();
  const [row] = await db
    .insert(persons)
    .values({
      treeId: input.treeId,
      name: input.name,
      birthYear: input.birthYear ?? null,
      deathYear: input.deathYear ?? null,
      birthLat: input.birthLat ?? null,
      birthLng: input.birthLng ?? null,
      birthPlace: encryptField(input.birthPlace, key),
      notes: encryptField(input.notes, key),
    })
    .returning();
  return mapPerson(row);
}

export async function updatePerson(id: number, treeId: number, input: UpdatePersonInput): Promise<Person | null> {
  const key = getKey();
  const updates: Partial<typeof persons.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name;
  if ('birthYear' in input) updates.birthYear = input.birthYear ?? null;
  if ('deathYear' in input) updates.deathYear = input.deathYear ?? null;
  if ('birthLat' in input) updates.birthLat = input.birthLat ?? null;
  if ('birthLng' in input) updates.birthLng = input.birthLng ?? null;
  if ('birthPlace' in input) updates.birthPlace = encryptField(input.birthPlace, key);
  if ('notes' in input) updates.notes = encryptField(input.notes, key);

  const [row] = await db
    .update(persons)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(persons.id, id), eq(persons.treeId, treeId)))
    .returning();
  return row ? mapPerson(row) : null;
}

export async function deletePerson(id: number, treeId: number): Promise<boolean> {
  const [row] = await db
    .delete(persons)
    .where(and(eq(persons.id, id), eq(persons.treeId, treeId)))
    .returning();
  return !!row;
}
