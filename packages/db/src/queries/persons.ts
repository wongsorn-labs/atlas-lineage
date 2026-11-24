import { and, eq, inArray, or } from 'drizzle-orm';
import { db } from '../client';
import { persons } from '../schema';
import { encryptField, decryptField } from '../crypto';
import { findApprovedLinkedPersonIds } from './person-links';
import type { Person, CreatePersonInput, UpdatePersonInput, PersonAttributes } from '@wongsorn-labs/atlas-lineage-shared';

/** Attributes are stored as one encrypted JSON blob so new field definitions never need a migration. */
function decodeAttributes(raw: string | null, key: string): PersonAttributes {
  const json = decryptField(raw, key);
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as PersonAttributes) : {};
  } catch {
    return {};
  }
}

function encodeAttributes(attrs: PersonAttributes | undefined, key: string): string | null {
  if (!attrs || Object.keys(attrs).length === 0) return null;
  return encryptField(JSON.stringify(attrs), key);
}

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
    nickname: row.nickname ?? null,
    attributes: decodeAttributes(row.attributes, key),
    photo: decryptField(row.photo, key),
    gender: row.gender ?? null,
    birthYear: row.birthYear ?? null,
    birthMonth: row.birthMonth ?? null,
    birthDay: row.birthDay ?? null,
    birthTime: row.birthTime ?? null,
    deathYear: row.deathYear ?? null,
    deathMonth: row.deathMonth ?? null,
    deathDay: row.deathDay ?? null,
    deathTime: row.deathTime ?? null,
    birthLat: row.birthLat ?? null,
    birthLng: row.birthLng ?? null,
    birthPlace: decryptField(row.birthPlace, key),
    notes: decryptField(row.notes, key),
    createdAt: row.createdAt?.toISOString() ?? '',
    updatedAt: row.updatedAt?.toISOString() ?? '',
  };
}

export async function findAllPersons(treeId: number): Promise<Person[]> {
  const linkedIds = await findApprovedLinkedPersonIds(treeId);
  const rows = await db
    .select()
    .from(persons)
    .where(
      linkedIds.length > 0
        ? or(eq(persons.treeId, treeId), inArray(persons.id, linkedIds))
        : eq(persons.treeId, treeId),
    );
  return rows.map(mapPerson);
}

export async function findPersonById(id: number, treeId: number): Promise<Person | null> {
  const [row] = await db.select().from(persons).where(eq(persons.id, id)).limit(1);
  if (!row) return null;
  if (row.treeId === treeId) return mapPerson(row);

  const linkedIds = await findApprovedLinkedPersonIds(treeId);
  return linkedIds.includes(id) ? mapPerson(row) : null;
}

export async function createPerson(input: CreatePersonInput): Promise<Person> {
  const key = getKey();
  const [row] = await db
    .insert(persons)
    .values({
      treeId: input.treeId,
      name: input.name?.trim() || input.nickname,
      nickname: input.nickname,
      attributes: encodeAttributes(input.attributes, key),
      photo: encryptField(input.photo ?? null, key),
      gender: input.gender ?? null,
      birthYear: input.birthYear ?? null,
      birthMonth: input.birthMonth ?? null,
      birthDay: input.birthDay ?? null,
      birthTime: input.birthTime ?? null,
      deathYear: input.deathYear ?? null,
      deathMonth: input.deathMonth ?? null,
      deathDay: input.deathDay ?? null,
      deathTime: input.deathTime ?? null,
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
  if (input.name !== undefined) updates.name = input.name ?? undefined;
  if (input.nickname !== undefined) updates.nickname = input.nickname;
  if (input.attributes !== undefined) updates.attributes = encodeAttributes(input.attributes, key);
  if ('photo' in input) updates.photo = encryptField(input.photo ?? null, key);
  if ('gender' in input) updates.gender = input.gender ?? null;
  if ('birthYear' in input) updates.birthYear = input.birthYear ?? null;
  if ('birthMonth' in input) updates.birthMonth = input.birthMonth ?? null;
  if ('birthDay' in input) updates.birthDay = input.birthDay ?? null;
  if ('birthTime' in input) updates.birthTime = input.birthTime ?? null;
  if ('deathYear' in input) updates.deathYear = input.deathYear ?? null;
  if ('deathMonth' in input) updates.deathMonth = input.deathMonth ?? null;
  if ('deathDay' in input) updates.deathDay = input.deathDay ?? null;
  if ('deathTime' in input) updates.deathTime = input.deathTime ?? null;
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
