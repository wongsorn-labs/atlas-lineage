import { execSync } from 'child_process';
import { resolve } from 'path';
import { DATABASE_URL } from './e2e.config';

export default async function globalSetup() {
  execSync('pnpm db:migrate', {
    cwd: resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  });
}
