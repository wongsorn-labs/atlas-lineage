import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'http';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import { AppModule } from '../apps/api/src/app.module';
import { HttpExceptionFilter } from '../apps/api/src/common/filters/http-exception.filter';
import { db } from '@wongsorn-labs/atlas-lineage-db';

type ExpressHandler = (req: IncomingMessage, res: ServerResponse) => void;

let cachedHandler: ExpressHandler | null = null;

async function bootstrap(): Promise<ExpressHandler> {
  if (cachedHandler) return cachedHandler;

  migrate(db, {
    migrationsFolder: join(process.cwd(), 'packages', 'db', 'drizzle'),
  });

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173'];
  app.enableCors({ origin: corsOrigins, credentials: true });

  await app.init();
  cachedHandler = app.getHttpAdapter().getInstance() as ExpressHandler;
  return cachedHandler;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const expressApp = await bootstrap();
  expressApp(req, res);
}
