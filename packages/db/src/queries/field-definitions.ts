import { and, asc, eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { db } from '../client';
import { fieldDefinitions } from '../schema';
import type { FieldDefinition, FieldValueType, FieldVisibility } from '@wongsorn-labs/atlas-lineage-shared';

export interface CreateFieldDefinitionRow {
  treeId: number;
  key?: string;
  label: string;
  category: string;
  valueType: FieldValueType;
  visibility: FieldVisibility;
  createdBy: string;
}

export interface UpdateFieldDefinitionRow {
  label?: string;
  category?: string;
  visibility?: FieldVisibility;
}

function mapFieldDefinition(row: typeof fieldDefinitions.$inferSelect): FieldDefinition {
  return {
    id: row.id,
    treeId: row.treeId,
    key: row.key,
    label: row.label,
    category: row.category,
    valueType: row.valueType as FieldValueType,
    visibility: row.visibility as FieldVisibility,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt?.toISOString() ?? '',
  };
}

export async function findFieldDefinitions(treeId: number): Promise<FieldDefinition[]> {
  const rows = await db
    .select()
    .from(fieldDefinitions)
    .where(eq(fieldDefinitions.treeId, treeId))
    .orderBy(asc(fieldDefinitions.category), asc(fieldDefinitions.id));
  return rows.map(mapFieldDefinition);
}

export async function createFieldDefinition(input: CreateFieldDefinitionRow): Promise<FieldDefinition> {
  const key = input.key ?? `f_${randomBytes(5).toString('hex')}`;
  const [row] = await db
    .insert(fieldDefinitions)
    .values({
      treeId: input.treeId,
      key,
      label: input.label,
      category: input.category,
      valueType: input.valueType,
      visibility: input.visibility,
      createdBy: input.createdBy,
    })
    .returning();
  return mapFieldDefinition(row);
}

export async function updateFieldDefinition(
  id: number,
  treeId: number,
  input: UpdateFieldDefinitionRow,
): Promise<FieldDefinition | null> {
  const updates: Partial<typeof fieldDefinitions.$inferInsert> = {};
  if (input.label !== undefined) updates.label = input.label;
  if (input.category !== undefined) updates.category = input.category;
  if (input.visibility !== undefined) updates.visibility = input.visibility;
  if (Object.keys(updates).length === 0) {
    const [row] = await db.select().from(fieldDefinitions)
      .where(and(eq(fieldDefinitions.id, id), eq(fieldDefinitions.treeId, treeId))).limit(1);
    return row ? mapFieldDefinition(row) : null;
  }
  const [row] = await db
    .update(fieldDefinitions)
    .set(updates)
    .where(and(eq(fieldDefinitions.id, id), eq(fieldDefinitions.treeId, treeId)))
    .returning();
  return row ? mapFieldDefinition(row) : null;
}

export async function deleteFieldDefinition(id: number, treeId: number): Promise<boolean> {
  const [row] = await db
    .delete(fieldDefinitions)
    .where(and(eq(fieldDefinitions.id, id), eq(fieldDefinitions.treeId, treeId)))
    .returning();
  return !!row;
}
