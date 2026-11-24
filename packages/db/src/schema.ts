import {
  pgTable, serial, integer, doublePrecision, text, time, timestamp, pgEnum, uniqueIndex, AnyPgColumn
} from 'drizzle-orm/pg-core';

export const treeRoleEnum = pgEnum('tree_role', ['owner', 'editor', 'viewer']);
export const genderEnum = pgEnum('gender', ['male', 'female', 'unspecified']);
export const personTreeLinkStatusEnum = pgEnum('person_tree_link_status', ['pending', 'approved']);
export const fieldValueTypeEnum = pgEnum('field_value_type', ['text', 'number', 'date', 'longtext']);
export const fieldVisibilityEnum = pgEnum('field_visibility', ['members', 'restricted']);

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  defaultCountry: text('default_country'),
  primaryTreeId: integer('primary_tree_id').references((): AnyPgColumn => familyTrees.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const familyTrees = pgTable('family_trees', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: text('owner_id').references(() => profiles.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const treeMembers = pgTable('tree_members', {
  id: serial('id').primaryKey(),
  treeId: integer('tree_id').notNull().references(() => familyTrees.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  role: treeRoleEnum('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  treeMembersTreeUserUidx: uniqueIndex('tree_members_tree_user_uidx').on(table.treeId, table.userId),
}));

export const persons = pgTable('persons', {
  id: serial('id').primaryKey(),
  treeId: integer('tree_id').notNull().references(() => familyTrees.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  nickname: text('nickname'),
  attributes: text('attributes'),
  gender: genderEnum('gender'),
  birthYear: integer('birth_year'),
  birthMonth: integer('birth_month'),
  birthDay: integer('birth_day'),
  birthTime: time('birth_time'),
  deathYear: integer('death_year'),
  deathMonth: integer('death_month'),
  deathDay: integer('death_day'),
  deathTime: time('death_time'),
  birthLat: doublePrecision('birth_lat'),
  birthLng: doublePrecision('birth_lng'),
  birthPlace: text('birth_place'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const relationships = pgTable('relationships', {
  id: serial('id').primaryKey(),
  treeId: integer('tree_id').notNull().references(() => familyTrees.id, { onDelete: 'cascade' }),
  personId: integer('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  relatedPersonId: integer('related_person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  side: text('side'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const fieldDefinitions = pgTable('field_definitions', {
  id: serial('id').primaryKey(),
  treeId: integer('tree_id').notNull().references(() => familyTrees.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  label: text('label').notNull(),
  category: text('category').notNull().default('general'),
  valueType: fieldValueTypeEnum('value_type').notNull().default('text'),
  visibility: fieldVisibilityEnum('visibility').notNull().default('members'),
  createdBy: text('created_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  fieldDefinitionsTreeKeyUidx: uniqueIndex('field_definitions_tree_key_uidx').on(table.treeId, table.key),
}));

export const personTrees = pgTable('person_trees', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  treeId: integer('tree_id').notNull().references(() => familyTrees.id, { onDelete: 'cascade' }),
  status: personTreeLinkStatusEnum('status').notNull().default('pending'),
  requestedBy: text('requested_by').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  decidedAt: timestamp('decided_at'),
}, (table) => ({
  personTreesPersonTreeUidx: uniqueIndex('person_trees_person_tree_uidx').on(table.personId, table.treeId),
}));
