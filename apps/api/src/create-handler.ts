import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

type ExpressHandler = (req: IncomingMessage, res: ServerResponse) => void;

let cachedHandler: ExpressHandler | null = null;

export async function createServerlessHandler(): Promise<ExpressHandler> {
  if (cachedHandler) return cachedHandler;

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api');
  app.use(cookieParser());
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
