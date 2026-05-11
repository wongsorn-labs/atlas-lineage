import { sqliteTable, integer, real, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const persons = sqliteTable('persons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  birthYear: integer('birth_year'),
  deathYear: integer('death_year'),
  birthLat: real('birth_lat'),
  birthLng: real('birth_lng'),
  birthPlace: text('birth_place'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const relationships = sqliteTable('relationships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  personId: integer('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  relatedPersonId: integer('related_person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['parent', 'child', 'sibling', 'spouse', 'partner'] }).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
