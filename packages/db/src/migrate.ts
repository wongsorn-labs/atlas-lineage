import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'path';
import { db } from './client';

export async function runMigrations() {
  await migrate(db, {
    migrationsFolder: join(process.cwd(), 'packages', 'db', 'drizzle'),
  });
}
