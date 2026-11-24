import { z } from 'zod';

export const RelationshipTypeSchema = z.enum(['parent', 'child', 'sibling', 'spouse', 'partner']);
export const GenderSchema = z.enum(['male', 'female', 'unspecified']);
export const LineSideSchema = z.enum(['paternal', 'maternal']);
export const FieldValueTypeSchema = z.enum(['text', 'number', 'date', 'longtext']);
export const FieldVisibilitySchema = z.enum(['members', 'restricted']);

/** Client resizes to a square no larger than 150px; the server only checks type and size. */
export const PHOTO_MAX_CHARS = 200_000;
export const PhotoDataUrlSchema = z
  .string()
  .max(PHOTO_MAX_CHARS, 'Photo is too large')
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'Photo must be a jpeg, png or webp data URL');

export const PersonAttributesSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));

const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Use HH:MM');

export const CreatePersonSchema = z.object({
  treeId: z.number().int().positive(),
  name: z.string().max(200).nullable().optional(),
  nickname: z.string().min(1, 'Nickname is required').max(60),
  attributes: PersonAttributesSchema.optional(),
  photo: PhotoDataUrlSchema.nullable().optional(),
  gender: GenderSchema.nullable().optional(),
  birthYear: z.number().int().nullable().optional(),
  birthMonth: z.number().int().min(1).max(12).nullable().optional(),
  birthDay: z.number().int().min(1).max(31).nullable().optional(),
  birthTime: timeStringSchema.nullable().optional(),
  deathYear: z.number().int().nullable().optional(),
  deathMonth: z.number().int().min(1).max(12).nullable().optional(),
  deathDay: z.number().int().min(1).max(31).nullable().optional(),
  deathTime: timeStringSchema.nullable().optional(),
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
  side: LineSideSchema.nullable().optional(),
});

export const treeRoleSchema = z.enum(['owner', 'editor', 'viewer']);

export const createTreeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const updateTreeSchema = createTreeSchema.partial();

export const addTreeMemberSchema = z.object({
  userId: z.string().uuid(),
  role: treeRoleSchema,
});

export const updateProfileSettingsSchema = z.object({
  defaultCountry: z.string().length(3).nullable().optional(),
  primaryTreeId: z.number().int().positive().nullable().optional(),
});

export const requestPersonLinkSchema = z.object({
  personId: z.number().int().positive(),
  treeId: z.number().int().positive(),
});

// ---- Family memory: field definitions, nickname-first persons, relationship side ----

export const CreateFieldDefinitionSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/, 'key must be lowercase letters, digits or _').optional(),
  label: z.string().min(1, 'Label is required').max(60),
  category: z.string().min(1).max(40).default('general'),
  valueType: FieldValueTypeSchema.default('text'),
  visibility: FieldVisibilitySchema.default('members'),
});

export const UpdateFieldDefinitionSchema = z.object({
  label: z.string().min(1).max(60).optional(),
  category: z.string().min(1).max(40).optional(),
  visibility: FieldVisibilitySchema.optional(),
});
