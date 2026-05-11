import { eq } from 'drizzle-orm';
import { db } from '../client';
import { persons } from '../schema';
import { encryptField, decryptField } from '../crypto';
import type { Person, CreatePersonInput, UpdatePersonInput } from '@atlas/shared';

function getKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY env var is required');
  return key;
}

function mapPerson(row: typeof persons.$inferSelect): Person {
  const key = getKey();
  return {
    id: row.id,
    name: row.name,
    birthYear: row.birthYear ?? null,
    deathYear: row.deathYear ?? null,
    birthLat: row.birthLat ?? null,
    birthLng: row.birthLng ?? null,
    birthPlace: decryptField(row.birthPlace, key),
    notes: decryptField(row.notes, key),
    createdAt: row.createdAt ?? '',
    updatedAt: row.updatedAt ?? '',
  };
}

export function findAllPersons(): Person[] {
  return db.select().from(persons).all().map(mapPerson);
}

export function findPersonById(id: number): Person | null {
  const row = db.select().from(persons).where(eq(persons.id, id)).get();
  return row ? mapPerson(row) : null;
}

export function createPerson(input: CreatePersonInput): Person {
  const key = getKey();
  const row = db
    .insert(persons)
    .values({
      name: input.name,
      birthYear: input.birthYear ?? null,
      deathYear: input.deathYear ?? null,
      birthLat: input.birthLat ?? null,
      birthLng: input.birthLng ?? null,
      birthPlace: encryptField(input.birthPlace, key),
      notes: encryptField(input.notes, key),
    })
    .returning()
    .get();
  return mapPerson(row);
}

export function updatePerson(id: number, input: UpdatePersonInput): Person | null {
  const key = getKey();
  const updates: Partial<typeof persons.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name;
  if ('birthYear' in input) updates.birthYear = input.birthYear ?? null;
  if ('deathYear' in input) updates.deathYear = input.deathYear ?? null;
  if ('birthLat' in input) updates.birthLat = input.birthLat ?? null;
  if ('birthLng' in input) updates.birthLng = input.birthLng ?? null;
  if ('birthPlace' in input) updates.birthPlace = encryptField(input.birthPlace, key);
  if ('notes' in input) updates.notes = encryptField(input.notes, key);

  const row = db
    .update(persons)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(eq(persons.id, id))
    .returning()
    .get();
  return row ? mapPerson(row) : null;
}

export function deletePerson(id: number): boolean {
  const row = db.delete(persons).where(eq(persons.id, id)).returning().get();
  return !!row;
}
