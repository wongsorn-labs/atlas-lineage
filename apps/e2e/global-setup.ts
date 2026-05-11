import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const TEST_DB = resolve(__dirname, '../../atlas-lineage.test.db');

export default async function globalSetup() {
  if (existsSync(TEST_DB)) {
    unlinkSync(TEST_DB);
  }
  execSync('pnpm db:migrate', {
    cwd: resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_PATH: TEST_DB },
    stdio: 'inherit',
  });
}
