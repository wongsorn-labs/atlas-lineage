import { pgTable, serial, integer, doublePrecision, text, timestamp } from 'drizzle-orm/pg-core';

export const persons = pgTable('persons', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  birthYear: integer('birth_year'),
  deathYear: integer('death_year'),
  birthLat: doublePrecision('birth_lat'),
  birthLng: doublePrecision('birth_lng'),
  birthPlace: text('birth_place'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const relationships = pgTable('relationships', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  relatedPersonId: integer('related_person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
