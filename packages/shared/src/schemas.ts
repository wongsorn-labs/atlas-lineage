import { z } from 'zod';

export const RelationshipTypeSchema = z.enum(['parent', 'child', 'sibling', 'spouse', 'partner']);

export const CreatePersonSchema = z.object({
  treeId: z.number().int().positive(),
  name: z.string().min(1, 'Name is required'),
  birthYear: z.number().int().nullable().optional(),
  deathYear: z.number().int().nullable().optional(),
  birthLat: z.number().min(-90).max(90).nullable().optional(),
  birthLng: z.number().min(-180).max(180).nullable().optional(),
  birthPlace: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const UpdatePersonSchema = CreatePersonSchema.omit({ treeId: true }).partial();

export const CreateRelationshipSchema = z.object({
  treeId: z.number().int().positive(),
  personId: z.number().int().positive(),
  relatedPersonId: z.number().int().positive(),
  type: RelationshipTypeSchema,
});

export const treeRoleSchema = z.enum(['owner', 'editor', 'viewer']);

export const createTreeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const addTreeMemberSchema = z.object({
  userId: z.string().uuid(),
  role: treeRoleSchema,
});
