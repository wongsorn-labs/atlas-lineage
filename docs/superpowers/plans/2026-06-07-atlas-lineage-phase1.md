# Atlas Lineage Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the foundation: Docker Compose PostgreSQL, Supabase Auth with HTTP-only cookie JWTs (access + refresh), multi-user data model with Owner/Editor/Viewer roles, and a Premium Liquid Glass dark UI with adaptive desktop/mobile layout.

**Architecture:** NestJS remains the API layer (Drizzle + business logic); Supabase Auth is used only for credential management — JWTs are issued by Supabase but verified by NestJS via the SupabaseAuthGuard reading HTTP-only cookies. New tables (profiles, family_trees, tree_members) are added in PostgreSQL. The web app has a Supabase client (`persistSession: false`) that only handles sign-in/sign-out flows; all data fetching goes through the NestJS API.

**Tech Stack:** NestJS 10, Drizzle ORM (drizzle-orm/node-postgres), PostgreSQL (Docker locally / Supabase in prod), Supabase JS v2 (web auth only), React 19, TanStack Query 5, Tailwind CSS v4 (`@tailwindcss/vite`), React Hook Form + Zod, cookie-parser, @nestjs/jwt, Leaflet + react-leaflet, Playwright (e2e), Vitest (web), Jest (api/db).

---

## File Structure

```
docker-compose.yml                              ← NEW: PostgreSQL dev container
apps/api/src/
  main.ts                                       ← MOD: cookie-parser + CORS credentials
  app.module.ts                                 ← MOD: add AuthModule + TreesModule
  auth/
    auth.module.ts                              ← NEW
    auth.controller.ts                          ← NEW: /api/auth/* endpoints
    auth.service.ts                             ← NEW: Supabase Admin SDK calls
    supabase-auth.guard.ts                      ← NEW: reads access_token cookie, verifies JWT
    auth.controller.spec.ts                     ← NEW
  trees/
    trees.module.ts                             ← NEW
    trees.controller.ts                         ← NEW: /api/trees/* endpoints
    trees.service.ts                            ← NEW
    tree-member.guard.ts                        ← NEW: role-based guard
    trees.controller.spec.ts                    ← NEW
  persons/
    persons.controller.ts                       ← MOD: add SupabaseAuthGuard + TreeMemberGuard
    persons.service.ts                          ← MOD: tree-scoped queries
    persons.service.spec.ts                     ← MOD: update mocks for tree context
  relationships/
    relationships.controller.ts                 ← MOD: add guards
packages/db/src/
  schema.ts                                     ← MOD: add profiles, family_trees, tree_members; tree_id on persons
  queries/
    persons.ts                                  ← MOD: filter by tree_id
    trees.ts                                    ← NEW: CRUD for trees + members
  index.ts                                      ← MOD: export new query functions
packages/shared/src/
  types.ts                                      ← MOD: add TreeRole, FamilyTree, TreeMember, UserProfile
  schemas.ts                                    ← MOD: add Zod schemas for new types
apps/web/src/
  styles/app.css                                ← MOD: dark theme + glass + gold tokens
  index.html (root)                             ← MOD: Google Fonts import
  lib/
    supabase.ts                                 ← NEW: Supabase client (persistSession: false)
  contexts/
    AuthContext.tsx                             ← NEW: user state + signIn/signOut/googleSignIn
  pages/
    LoginPage.tsx                               ← NEW: email+password + Google OAuth button
  components/
    layout/
      AppShell.tsx                              ← NEW: adaptive wrapper (desktop rail + sidebar, mobile header + tabs)
      IconRail.tsx                              ← NEW: desktop left icon rail (64px)
      MobileHeader.tsx                          ← NEW: mobile top header
      BottomTabs.tsx                            ← NEW: mobile bottom nav (4 tabs)
    MapView.tsx                                 ← MOD: Carto dark tiles
    PersonMarker.tsx                            ← MOD: gold glow DivIcon
    PersonCard.tsx                              ← MOD: glass card, Playfair heading, pill badges
    Sidebar.tsx                                 ← MOD: search input + year range filter
  api/
    client.ts                                   ← MOD: credentials: 'include', 401→refresh interceptor
  App.tsx                                       ← MOD: wrap in AuthContext + AppShell + LoginPage guard
```

---

### Task 1: Docker Compose Setup

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/api/.env` (gitignored — for local dev only)

- [ ] **Step 1: Create docker-compose.yml**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    container_name: atlas_lineage_db
    environment:
      POSTGRES_DB: atlas_lineage
      POSTGRES_USER: atlas
      POSTGRES_PASSWORD: atlas_dev_password
    ports:
      - "5432:5432"
    volumes:
      - atlas_postgres_data:/var/lib/postgresql/data

volumes:
  atlas_postgres_data:
```

- [ ] **Step 2: Create `apps/api/.env` for local development**

```dotenv
DATABASE_URL=postgresql://atlas:atlas_dev_password@localhost:5432/atlas_lineage
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
PORT=3001
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here
COOKIE_ACCESS_TOKEN_NAME=access_token
COOKIE_REFRESH_TOKEN_NAME=refresh_token
COOKIE_MAX_AGE_ACCESS=3600
COOKIE_MAX_AGE_REFRESH=604800
NODE_ENV=development
```

Create `apps/api/.env.example` with the same keys but empty/placeholder values (safe to commit).

- [ ] **Step 3: Start the container and verify**

Run:
```bash
docker compose up -d
docker compose ps
```

Expected: `atlas_lineage_db` container in `running` state.

Test connection (using psql or DBeaver with host=localhost, port=5432, db=atlas_lineage, user=atlas, password=atlas_dev_password).

- [ ] **Step 4: Run existing migrations**

```bash
pnpm db:migrate
```

Expected: Drizzle applies existing migrations without error.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml apps/api/.env.example
git commit -m "feat(api): add Docker Compose PostgreSQL dev setup"
```

---

### Task 2: Shared Types Extension

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/schemas.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Add new types to `packages/shared/src/types.ts`**

Append to the existing file after the last export:

```typescript
export type TreeRole = 'owner' | 'editor' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface FamilyTree {
  id: number;
  name: string;
  description: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TreeMember {
  id: number;
  treeId: number;
  userId: string;
  role: TreeRole;
  createdAt: string;
}

export interface CreateTreeInput {
  name: string;
  description?: string | null;
}

export interface AddTreeMemberInput {
  userId: string;
  role: TreeRole;
}
```

- [ ] **Step 2: Add Zod schemas to `packages/shared/src/schemas.ts`**

Append to the existing file after the last schema:

```typescript
import { z } from 'zod';

export const treeRoleSchema = z.enum(['owner', 'editor', 'viewer']);

export const createTreeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const addTreeMemberSchema = z.object({
  userId: z.string().uuid(),
  role: treeRoleSchema,
});
```

- [ ] **Step 3: Export from `packages/shared/src/index.ts`**

The existing `index.ts` re-exports from types.ts and schemas.ts — no change needed if it uses `export * from './types'` and `export * from './schemas'`. Verify:

```bash
cat packages/shared/src/index.ts
```

If it doesn't re-export everything, add the new names explicitly.

- [ ] **Step 4: Build shared package to verify**

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-shared build
```

Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/schemas.ts packages/shared/src/index.ts
git commit -m "feat(shared): add TreeRole, FamilyTree, TreeMember, UserProfile types and schemas"
```

---

### Task 3: Database Schema Extensions

**Files:**
- Modify: `packages/db/src/schema.ts`
- Modify: `packages/db/src/index.ts`
- New migration: generated by `pnpm db:generate`

- [ ] **Step 1: Update `packages/db/src/schema.ts`**

Replace the entire file:

```typescript
import {
  pgTable, serial, integer, doublePrecision, text, timestamp, pgEnum
} from 'drizzle-orm/pg-core';

export const treeRoleEnum = pgEnum('tree_role', ['owner', 'editor', 'viewer']);

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const familyTrees = pgTable('family_trees', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: text('owner_id').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const treeMembers = pgTable('tree_members', {
  id: serial('id').primaryKey(),
  treeId: integer('tree_id').notNull().references(() => familyTrees.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  role: treeRoleEnum('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const persons = pgTable('persons', {
  id: serial('id').primaryKey(),
  treeId: integer('tree_id').references(() => familyTrees.id, { onDelete: 'cascade' }),
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
```

- [ ] **Step 2: Generate migration SQL**

```bash
pnpm db:generate
```

Expected: A new file in `packages/db/drizzle/` with the ALTER TABLE and CREATE TABLE statements.

- [ ] **Step 3: Write the backfill migration**

The generated migration adds `tree_id` as nullable. We need a second migration to:
1. Insert a default "Family" tree
2. Backfill existing persons to tree_id=1
3. (Do NOT add NOT NULL yet — leave nullable for compatibility; the app filters by tree when a user is authenticated)

Create `packages/db/drizzle/0002_backfill_default_tree.sql`:

```sql
-- Insert default family tree (owner set later when first user claims it)
INSERT INTO family_trees (id, name, description, owner_id, created_at, updated_at)
VALUES (1, 'Family', 'Default family tree', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Backfill all existing persons without a tree to tree_id=1
UPDATE persons SET tree_id = 1 WHERE tree_id IS NULL;
```

- [ ] **Step 4: Apply migrations**

```bash
pnpm db:migrate
```

Expected: All migrations apply without error.

- [ ] **Step 5: Create `packages/db/src/queries/trees.ts`**

```typescript
import { eq, and } from 'drizzle-orm';
import { db } from '../client';
import { familyTrees, treeMembers, profiles } from '../schema';
import type { FamilyTree, TreeMember, TreeRole, CreateTreeInput, AddTreeMemberInput } from '@wongsorn-labs/atlas-lineage-shared';

function mapTree(row: typeof familyTrees.$inferSelect): FamilyTree {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    ownerId: row.ownerId ?? null,
    createdAt: row.createdAt?.toISOString() ?? '',
    updatedAt: row.updatedAt?.toISOString() ?? '',
  };
}

function mapMember(row: typeof treeMembers.$inferSelect): TreeMember {
  return {
    id: row.id,
    treeId: row.treeId,
    userId: row.userId,
    role: row.role as TreeRole,
    createdAt: row.createdAt?.toISOString() ?? '',
  };
}

export async function findTreesByUser(userId: string): Promise<FamilyTree[]> {
  const rows = await db
    .select({ tree: familyTrees })
    .from(treeMembers)
    .innerJoin(familyTrees, eq(treeMembers.treeId, familyTrees.id))
    .where(eq(treeMembers.userId, userId));
  return rows.map((r) => mapTree(r.tree));
}

export async function findTreeById(treeId: number): Promise<FamilyTree | null> {
  const [row] = await db.select().from(familyTrees).where(eq(familyTrees.id, treeId)).limit(1);
  return row ? mapTree(row) : null;
}

export async function createTree(input: CreateTreeInput, ownerId: string): Promise<FamilyTree> {
  const [row] = await db
    .insert(familyTrees)
    .values({ name: input.name, description: input.description ?? null, ownerId })
    .returning();
  await db.insert(treeMembers).values({ treeId: row.id, userId: ownerId, role: 'owner' });
  return mapTree(row);
}

export async function findMemberRole(treeId: number, userId: string): Promise<TreeRole | null> {
  const [row] = await db
    .select()
    .from(treeMembers)
    .where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, userId)))
    .limit(1);
  return row ? (row.role as TreeRole) : null;
}

export async function addTreeMember(treeId: number, input: AddTreeMemberInput): Promise<TreeMember> {
  const [row] = await db
    .insert(treeMembers)
    .values({ treeId, userId: input.userId, role: input.role })
    .returning();
  return mapMember(row);
}

export async function upsertProfile(id: string, email: string, displayName?: string | null, avatarUrl?: string | null): Promise<void> {
  await db
    .insert(profiles)
    .values({ id, email, displayName: displayName ?? null, avatarUrl: avatarUrl ?? null })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { email, displayName: displayName ?? null, avatarUrl: avatarUrl ?? null },
    });
}

export async function claimDefaultTree(userId: string): Promise<void> {
  const [defaultTree] = await db
    .select()
    .from(familyTrees)
    .where(and(eq(familyTrees.id, 1)))
    .limit(1);
  if (defaultTree && defaultTree.ownerId === null) {
    await db.update(familyTrees).set({ ownerId: userId }).where(eq(familyTrees.id, 1));
    await db
      .insert(treeMembers)
      .values({ treeId: 1, userId, role: 'owner' })
      .onConflictDoNothing();
  }
}
```

- [ ] **Step 6: Export new queries from `packages/db/src/index.ts`**

Add to the exports:

```typescript
export * from './queries/trees';
```

- [ ] **Step 7: Verify db package builds**

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-db build
```

Expected: No TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add packages/db/src/ packages/db/drizzle/
git commit -m "feat(db): add profiles, family_trees, tree_members schema and tree queries"
```

---

### Task 4: Install New Dependencies

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add API dependencies**

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-api add cookie-parser @nestjs/jwt @supabase/supabase-js
pnpm --filter @wongsorn-labs/atlas-lineage-api add -D @types/cookie-parser
```

- [ ] **Step 2: Add Web dependencies**

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-web add @supabase/supabase-js
```

- [ ] **Step 3: Verify install**

```bash
pnpm install
```

Expected: No errors. Lockfile updated.

- [ ] **Step 4: Verify existing tests still pass**

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-api test
pnpm --filter @wongsorn-labs/atlas-lineage-web test
```

Expected: API 30/30 pass, Web 17/17 pass.

- [ ] **Step 5: Commit**

```bash
git add pnpm-lock.yaml apps/api/package.json apps/web/package.json
git commit -m "chore(api,web): add cookie-parser, @nestjs/jwt, @supabase/supabase-js dependencies"
```

---

### Task 5: API Bootstrap — Cookie Parser + CORS

**Files:**
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Update `apps/api/src/main.ts`**

```typescript
import 'reflect-metadata';
import * as cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173'];
  app.enableCors({ origin: corsOrigins, credentials: true });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
```

- [ ] **Step 2: Start API and verify cookies work**

```bash
cd apps/api && pnpm dev
```

In a separate terminal:

```bash
curl -v http://localhost:3001/api/health
```

Expected: `{ "status": "ok", "timestamp": "..." }`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/main.ts
git commit -m "feat(api): add cookie-parser middleware and CORS credentials support"
```

---

### Task 6: SupabaseAuthGuard + AuthModule

**Files:**
- Create: `apps/api/src/auth/supabase-auth.guard.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.controller.spec.ts`

- [ ] **Step 1: Write failing test for AuthController**

Create `apps/api/src/auth/auth.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  signIn: jest.fn(),
  signOut: jest.fn(),
  refreshSession: jest.fn(),
  getUser: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
```

Run:

```bash
cd apps/api && pnpm exec jest src/auth/auth.controller.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 2: Create `apps/api/src/auth/supabase-auth.guard.ts`**

```typescript
import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import type { Request } from 'express';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string; email: string } }>();
    const cookieName = process.env.COOKIE_ACCESS_TOKEN_NAME ?? 'access_token';
    const token: string | undefined = req.cookies?.[cookieName];
    if (!token) throw new UnauthorizedException('Missing access token');

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Invalid or expired token');

    req.user = { id: data.user.id, email: data.user.email! };
    return true;
  }
}
```

- [ ] **Step 3: Create `apps/api/src/auth/auth.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { upsertProfile, claimDefaultTree } from '@wongsorn-labs/atlas-lineage-db';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(error?.message ?? 'Sign-in failed');
    await upsertProfile(data.user.id, data.user.email!);
    await claimDefaultTree(data.user.id);
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: { id: data.user.id, email: data.user.email },
    };
  }

  async refreshSession(refreshToken: string) {
    const { data, error } = await this.supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) throw new Error(error?.message ?? 'Refresh failed');
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  async signOut(accessToken: string) {
    await this.supabase.auth.admin.signOut(accessToken);
  }

  async getUser(accessToken: string) {
    const { data, error } = await this.supabase.auth.getUser(accessToken);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email };
  }
}
```

- [ ] **Step 4: Create `apps/api/src/auth/auth.controller.ts`**

```typescript
import {
  Controller, Post, Get, Body, Req, Res, UnauthorizedException, HttpCode,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

function setCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  const accessName = process.env.COOKIE_ACCESS_TOKEN_NAME ?? 'access_token';
  const refreshName = process.env.COOKIE_REFRESH_TOKEN_NAME ?? 'refresh_token';
  const accessMaxAge = Number(process.env.COOKIE_MAX_AGE_ACCESS ?? 3600) * 1000;
  const refreshMaxAge = Number(process.env.COOKIE_MAX_AGE_REFRESH ?? 604800) * 1000;

  res.cookie(accessName, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: accessMaxAge,
    path: '/',
  });
  res.cookie(refreshName, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: refreshMaxAge,
    path: '/api/auth/refresh',
  });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signIn(body.email, body.password);
    setCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshName = process.env.COOKIE_REFRESH_TOKEN_NAME ?? 'refresh_token';
    const refreshToken = req.cookies?.[refreshName];
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    const result = await this.authService.refreshSession(refreshToken);
    setCookies(res, result.accessToken, result.refreshToken);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessName = process.env.COOKIE_ACCESS_TOKEN_NAME ?? 'access_token';
    const refreshName = process.env.COOKIE_REFRESH_TOKEN_NAME ?? 'refresh_token';
    const token = req.cookies?.[accessName];
    if (token) await this.authService.signOut(token);
    res.clearCookie(accessName, { path: '/' });
    res.clearCookie(refreshName, { path: '/api/auth/refresh' });
    return { ok: true };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const accessName = process.env.COOKIE_ACCESS_TOKEN_NAME ?? 'access_token';
    const token = req.cookies?.[accessName];
    if (!token) throw new UnauthorizedException();
    const user = await this.authService.getUser(token);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
```

- [ ] **Step 5: Create `apps/api/src/auth/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthGuard],
  exports: [SupabaseAuthGuard, AuthService],
})
export class AuthModule {}
```

- [ ] **Step 6: Run tests**

```bash
cd apps/api && pnpm exec jest src/auth/auth.controller.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/auth/
git commit -m "feat(api): add SupabaseAuthGuard, AuthService, and AuthController with HTTP-only cookie sessions"
```

---

### Task 7: TreesModule + TreeMemberGuard

**Files:**
- Create: `apps/api/src/trees/trees.module.ts`
- Create: `apps/api/src/trees/trees.service.ts`
- Create: `apps/api/src/trees/trees.controller.ts`
- Create: `apps/api/src/trees/tree-member.guard.ts`
- Create: `apps/api/src/trees/trees.controller.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/trees/trees.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TreesController } from './trees.controller';
import { TreesService } from './trees.service';

const mockTreesService = {
  getTreesForUser: jest.fn(),
  createTree: jest.fn(),
  addMember: jest.fn(),
};

describe('TreesController', () => {
  let controller: TreesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TreesController],
      providers: [{ provide: TreesService, useValue: mockTreesService }],
    }).compile();
    controller = module.get<TreesController>(TreesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
```

Run:

```bash
cd apps/api && pnpm exec jest src/trees/trees.controller.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 2: Create `apps/api/src/trees/trees.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import {
  findTreesByUser, findTreeById, createTree, addTreeMember, findMemberRole,
} from '@wongsorn-labs/atlas-lineage-db';
import type { CreateTreeInput, AddTreeMemberInput } from '@wongsorn-labs/atlas-lineage-shared';

@Injectable()
export class TreesService {
  getTreesForUser(userId: string) {
    return findTreesByUser(userId);
  }

  createTree(input: CreateTreeInput, ownerId: string) {
    return createTree(input, ownerId);
  }

  getTree(treeId: number) {
    return findTreeById(treeId);
  }

  addMember(treeId: number, input: AddTreeMemberInput) {
    return addTreeMember(treeId, input);
  }

  getMemberRole(treeId: number, userId: string) {
    return findMemberRole(treeId, userId);
  }
}
```

- [ ] **Step 3: Create `apps/api/src/trees/tree-member.guard.ts`**

```typescript
import {
  CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TreesService } from './trees.service';
import type { Request } from 'express';
import type { TreeRole } from '@wongsorn-labs/atlas-lineage-shared';

export const REQUIRED_ROLES_KEY = 'requiredRoles';

export const RequireRoles = (...roles: TreeRole[]) =>
  Reflect.metadata(REQUIRED_ROLES_KEY, roles);

@Injectable()
export class TreeMemberGuard implements CanActivate {
  constructor(
    private readonly treesService: TreesService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('No authenticated user');

    const treeId = Number(req.params.treeId ?? req.body?.treeId ?? req.query.treeId);
    if (!treeId || isNaN(treeId)) return true;

    const role = await this.treesService.getMemberRole(treeId, userId);
    if (!role) throw new NotFoundException('Tree not found or no access');

    const required = this.reflector.get<TreeRole[]>(REQUIRED_ROLES_KEY, context.getHandler()) ?? [];
    if (required.length === 0) return true;

    const hierarchy: Record<TreeRole, number> = { owner: 3, editor: 2, viewer: 1 };
    const userLevel = hierarchy[role];
    const minRequired = Math.min(...required.map((r) => hierarchy[r]));
    if (userLevel < minRequired) throw new ForbiddenException('Insufficient role');

    return true;
  }
}
```

- [ ] **Step 4: Create `apps/api/src/trees/trees.controller.ts`**

```typescript
import {
  Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { TreesService } from './trees.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { CreateTreeInput, AddTreeMemberInput } from '@wongsorn-labs/atlas-lineage-shared';

@Controller('trees')
@UseGuards(SupabaseAuthGuard)
export class TreesController {
  constructor(private readonly treesService: TreesService) {}

  @Get()
  listTrees(@Req() req: Request & { user: { id: string } }) {
    return this.treesService.getTreesForUser(req.user.id);
  }

  @Post()
  createTree(
    @Body() body: CreateTreeInput,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.treesService.createTree(body, req.user.id);
  }

  @Post(':treeId/members')
  addMember(
    @Param('treeId', ParseIntPipe) treeId: number,
    @Body() body: AddTreeMemberInput,
  ) {
    return this.treesService.addMember(treeId, body);
  }
}
```

- [ ] **Step 5: Create `apps/api/src/trees/trees.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TreesController } from './trees.controller';
import { TreesService } from './trees.service';
import { TreeMemberGuard } from './tree-member.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TreesController],
  providers: [TreesService, TreeMemberGuard],
  exports: [TreesService, TreeMemberGuard],
})
export class TreesModule {}
```

- [ ] **Step 6: Run tests**

```bash
cd apps/api && pnpm exec jest src/trees/trees.controller.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/trees/
git commit -m "feat(api): add TreesModule, TreesService, TreesController, and TreeMemberGuard"
```

---

### Task 8: Wire AuthModule + TreesModule into AppModule

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Update `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PersonsModule } from './persons/persons.module';
import { RelationshipsModule } from './relationships/relationships.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { TreesModule } from './trees/trees.module';

@Module({
  imports: [AuthModule, TreesModule, PersonsModule, RelationshipsModule],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 2: Run all API tests**

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-api test
```

Expected: All pass (including the new auth + trees specs).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(api): register AuthModule and TreesModule in AppModule"
```

---

### Task 9: Persons & Relationships — Add Auth Guards

**Files:**
- Modify: `apps/api/src/persons/persons.controller.ts`
- Modify: `apps/api/src/relationships/relationships.controller.ts`

- [ ] **Step 1: Update `apps/api/src/persons/persons.controller.ts`**

Add `@UseGuards(SupabaseAuthGuard)` to the controller class decorator. No tree-scoping in this task — that comes in Phase 2 when tree selection UI is built. For now, guards simply require authentication.

Locate the existing `@Controller('persons')` line and add the guard:

```typescript
import { UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('persons')
@UseGuards(SupabaseAuthGuard)
export class PersonsController {
  // ... existing methods unchanged
}
```

- [ ] **Step 2: Update `apps/api/src/relationships/relationships.controller.ts`**

Same pattern — add `@UseGuards(SupabaseAuthGuard)`:

```typescript
import { UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('relationships')
@UseGuards(SupabaseAuthGuard)
export class RelationshipsController {
  // ... existing methods unchanged
}
```

- [ ] **Step 3: Update persons service spec to mock the guard**

In `apps/api/src/persons/persons.service.spec.ts`, the guard won't matter for service tests. The controller spec (if it exists) needs `overrideGuard`. Check:

```bash
ls apps/api/src/persons/*.spec.ts
```

If `persons.controller.spec.ts` exists, add:

```typescript
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
// inside createTestingModule:
.overrideGuard(SupabaseAuthGuard).useValue({ canActivate: () => true })
```

- [ ] **Step 4: Run all API tests**

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-api test
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/persons/ apps/api/src/relationships/
git commit -m "feat(api): require authentication on persons and relationships endpoints"
```

---

### Task 10: Web Supabase Client + AuthContext

**Files:**
- Create: `apps/web/src/lib/supabase.ts`
- Create: `apps/web/src/contexts/AuthContext.tsx`
- Create: `apps/web/src/pages/LoginPage.tsx`

- [ ] **Step 1: Create `apps/web/src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: true,
  },
});
```

- [ ] **Step 2: Create `apps/web/.env.local`** (gitignored)

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

- [ ] **Step 3: Create `apps/web/src/contexts/AuthContext.tsx`**

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../api/client';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.auth.me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    setUser(result.user);
  };

  const signOut = async () => {
    await api.auth.logout();
    setUser(null);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Create `apps/web/src/pages/LoginPage.tsx`**

```typescript
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[--bg-base]">
      <div className="glass-card w-full max-w-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-display text-3xl font-semibold text-[--gold]">Atlas Lineage</h1>
          <p className="text-sm text-[--text-muted]">Sign in to your family tree</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-glass w-full"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-medium text-[--text-secondary] uppercase tracking-wider">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-glass w-full"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-xs text-[--text-muted]">or</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add auth endpoints to the API client**

In `apps/web/src/api/client.ts`, add the auth section (see Task 11 below for the full updated client).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/ apps/web/src/contexts/ apps/web/src/pages/ apps/web/.env.example
git commit -m "feat(web): add Supabase client, AuthContext, and LoginPage"
```

---

### Task 11: API Client — Auth-Aware with Refresh Interceptor

**Files:**
- Modify: `apps/web/src/api/client.ts`

- [ ] **Step 1: Replace `apps/web/src/api/client.ts` with auth-aware version**

```typescript
import type {
  Person,
  Relationship,
  CreatePersonInput,
  UpdatePersonInput,
  CreateRelationshipInput,
  FamilyTree,
  CreateTreeInput,
  AddTreeMemberInput,
  TreeMember,
} from '@wongsorn-labs/atlas-lineage-shared';

const BASE = '/api';
let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

async function request<T>(url: string, options?: RequestInit, retry = true): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
    ...options,
  });

  if (res.status === 401 && retry) {
    if (isRefreshing) {
      return new Promise<T>((resolve) => {
        refreshQueue.push(() => resolve(request<T>(url, options, false)));
      });
    }
    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!refreshRes.ok) throw new Error('Refresh failed');
      refreshQueue.forEach((fn) => fn());
      refreshQueue = [];
      return request<T>(url, options, false);
    } catch {
      refreshQueue = [];
      window.location.href = '/login';
      throw new Error('Session expired');
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: { id: string; email: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    me: () => request<{ id: string; email: string }>('/auth/me'),
  },
  trees: {
    list: () => request<FamilyTree[]>('/trees'),
    create: (data: CreateTreeInput) =>
      request<FamilyTree>('/trees', { method: 'POST', body: JSON.stringify(data) }),
    addMember: (treeId: number, data: AddTreeMemberInput) =>
      request<TreeMember>(`/trees/${treeId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  },
  persons: {
    list: () => request<Person[]>('/persons'),
    get: (id: number) => request<Person>(`/persons/${id}`),
    create: (data: CreatePersonInput) =>
      request<Person>('/persons', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: UpdatePersonInput) =>
      request<Person>(`/persons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/persons/${id}`, { method: 'DELETE' }),
  },
  relationships: {
    list: () => request<Relationship[]>('/relationships'),
    byPerson: (personId: number) =>
      request<Relationship[]>(`/relationships/person/${personId}`),
    create: (data: CreateRelationshipInput) =>
      request<Relationship>('/relationships', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/relationships/${id}`, { method: 'DELETE' }),
  },
};
```

- [ ] **Step 2: Verify web tests still pass**

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-web test
```

Expected: 17/17 pass (MSW still intercepts; `credentials: 'include'` is ignored by MSW).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/client.ts
git commit -m "feat(web): update API client with credentials:include and 401 refresh interceptor"
```

---

### Task 12: Premium Dark UI Theme

**Files:**
- Modify: `apps/web/src/styles/app.css`
- Modify: `apps/web/index.html`

- [ ] **Step 1: Update `apps/web/index.html` to import fonts**

Find the `<head>` section and add before the closing `</head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Replace `apps/web/src/styles/app.css` with premium dark theme**

```css
@import "tailwindcss";

@theme {
  --font-display: "Playfair Display", Georgia, serif;
  --font-body: "Inter", system-ui, sans-serif;

  /* Dark base palette */
  --color-bg-base: #0a0b0f;
  --color-bg-surface: #12141a;
  --color-bg-elevated: #1a1d26;
  --color-bg-glass: rgba(18, 20, 26, 0.7);

  /* Gold accent */
  --color-gold: #EAB308;
  --color-gold-muted: rgba(234, 179, 8, 0.15);
  --color-gold-glow: rgba(234, 179, 8, 0.45);

  /* Text */
  --color-text-primary: #f1f2f4;
  --color-text-secondary: #9ca3b0;
  --color-text-muted: #6b7280;

  /* Borders */
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-gold: rgba(234, 179, 8, 0.3);

  /* Status */
  --color-error: #f87171;
  --color-success: #4ade80;
}

@layer base {
  :root {
    --bg-base: var(--color-bg-base);
    --bg-surface: var(--color-bg-surface);
    --bg-elevated: var(--color-bg-elevated);
    --bg-glass: var(--color-bg-glass);
    --gold: var(--color-gold);
    --gold-muted: var(--color-gold-muted);
    --gold-glow: var(--color-gold-glow);
    --text-primary: var(--color-text-primary);
    --text-secondary: var(--color-text-secondary);
    --text-muted: var(--color-text-muted);
    --border: var(--color-border);
    --border-gold: var(--color-border-gold);
    --radius: 0.75rem;
  }

  * {
    border-color: var(--border);
    box-sizing: border-box;
  }

  html {
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
  }

  body {
    background-color: var(--bg-base);
    color: var(--text-primary);
    font-synthesis: none;
  }
}

@layer components {
  .glass-card {
    background: var(--bg-glass);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .glass-card-gold {
    background: var(--bg-glass);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid var(--border-gold);
    border-radius: var(--radius);
  }

  .btn-primary {
    background: var(--gold);
    color: #0a0b0f;
    font-weight: 600;
    font-size: 0.875rem;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    border: none;
    cursor: pointer;
    transition: opacity 150ms ease, box-shadow 150ms ease;
  }

  .btn-primary:hover {
    opacity: 0.9;
    box-shadow: 0 0 16px 2px var(--gold-glow);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-weight: 500;
    font-size: 0.875rem;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border);
    cursor: pointer;
    transition: border-color 150ms ease, background 150ms ease;
  }

  .btn-secondary:hover {
    border-color: var(--border-gold);
    background: var(--bg-glass);
  }

  .btn-ghost {
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.875rem;
    padding: 0.5rem;
    border-radius: 0.5rem;
    border: none;
    cursor: pointer;
    transition: color 150ms ease, background 150ms ease;
  }

  .btn-ghost:hover {
    color: var(--text-primary);
    background: var(--gold-muted);
  }

  .input-glass {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    outline: none;
    transition: border-color 150ms ease;
  }

  .input-glass::placeholder {
    color: var(--text-muted);
  }

  .input-glass:focus {
    border-color: var(--border-gold);
    box-shadow: 0 0 0 2px var(--gold-muted);
  }

  .font-display {
    font-family: var(--font-display);
  }

  .pill-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: capitalize;
    background: var(--gold-muted);
    color: var(--gold);
    border: 1px solid var(--border-gold);
  }
}

/* Leaflet: prevent Tailwind reset from breaking map tiles */
.leaflet-container {
  box-sizing: content-box !important;
  background: var(--bg-base);
}

.leaflet-container * {
  box-sizing: content-box !important;
}
```

- [ ] **Step 3: Verify web builds**

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-web build
```

Expected: No errors, CSS variables resolve correctly.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/styles/app.css apps/web/index.html
git commit -m "feat(web): premium dark Liquid Glass theme with gold accent and Playfair Display"
```

---

### Task 13: App.tsx — AuthProvider + Login Guard

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Wrap `apps/web/src/main.tsx` with AuthProvider**

Read `apps/web/src/main.tsx` first to see current structure, then wrap `<App />` with `<AuthProvider>`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import './styles/app.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 2: Update `apps/web/src/App.tsx` to guard with login**

```typescript
import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import { usePersons } from './hooks/usePersons';
import { useRelationships } from './hooks/useRelationships';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';

export default function App() {
  const { user, isLoading: authLoading } = useAuth();
  const personsQuery = usePersons();
  const relationshipsQuery = useRelationships();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const { t } = useTranslation();

  const persons = personsQuery.data ?? [];
  const relationships = relationshipsQuery.data ?? [];
  const isLoading = personsQuery.isLoading || relationshipsQuery.isLoading;
  const hasError = personsQuery.isError || relationshipsQuery.isError;

  useEffect(() => {
    if (!selectedPerson) return;
    const nextSelected = persons.find((person) => person.id === selectedPerson.id) ?? null;
    if (nextSelected !== selectedPerson) setSelectedPerson(nextSelected);
  }, [persons, selectedPerson]);

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[--bg-base] text-[--text-muted]">
        <div className="flex items-center gap-2 text-sm" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[--bg-base] text-[--text-muted]">
        <div className="flex items-center gap-2 text-sm" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('app.loading')}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[--bg-base] px-6">
        <div className="glass-card flex max-w-sm flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-[--color-error]" />
          <h1 className="font-display text-lg font-semibold text-[--text-primary]">{t('app.errorTitle')}</h1>
          <p className="text-sm text-[--text-secondary]">{t('app.errorBody')}</p>
          <div className="flex gap-2">
            {personsQuery.isError && (
              <button type="button" className="btn-primary" onClick={() => void personsQuery.refetch()}>
                {t('app.retryPeople')}
              </button>
            )}
            {relationshipsQuery.isError && (
              <button type="button" className="btn-secondary" onClick={() => void relationshipsQuery.refetch()}>
                {t('app.retryRelationships')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[--bg-base]">
      <Sidebar
        persons={persons}
        selectedPerson={selectedPerson}
        onSelectPerson={setSelectedPerson}
      />
      <main className="flex-1 relative">
        <MapView
          persons={persons}
          relationships={relationships}
          selectedPerson={selectedPerson}
          onSelectPerson={setSelectedPerson}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Run web tests**

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-web test
```

Expected: All pass. (The MSW mocks do not need a user since the hooks are only invoked after auth check — if any test calls a hook directly, mock `useAuth` to return a user.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/main.tsx
git commit -m "feat(web): wrap app with AuthProvider and show LoginPage for unauthenticated users"
```

---

### Task 14: Dark Map + Gold Glow Markers

**Files:**
- Modify: `apps/web/src/components/MapView.tsx`
- Modify: `apps/web/src/components/PersonMarker.tsx`
- Modify: `apps/web/src/styles/app.css`

- [ ] **Step 1: Update `apps/web/src/components/MapView.tsx` — switch to Carto dark tiles**

Find the `<TileLayer>` component and replace the url and attribution:

```typescript
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  subdomains="abcd"
  maxZoom={19}
/>
```

- [ ] **Step 2: Update `apps/web/src/components/PersonMarker.tsx` — gold glow DivIcon**

Replace the marker icon creation with a DivIcon:

```typescript
import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';

const goldIcon = L.divIcon({
  className: 'atlas-marker',
  html: '<div class="atlas-marker-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -12],
});
```

Use `icon={goldIcon}` on the `<Marker>` element.

- [ ] **Step 3: Add marker styles to `apps/web/src/styles/app.css`**

Add inside the `@layer components` block:

```css
.atlas-marker {
  background: transparent !important;
  border: none !important;
}

.atlas-marker-dot {
  width: 14px;
  height: 14px;
  background: #EAB308;
  border-radius: 50%;
  border: 2px solid rgba(234, 179, 8, 0.6);
  box-shadow: 0 0 10px 3px rgba(234, 179, 8, 0.45), 0 0 20px 6px rgba(234, 179, 8, 0.2);
  transition: box-shadow 150ms ease, transform 150ms ease;
}

.atlas-marker-dot:hover,
.atlas-marker-selected .atlas-marker-dot {
  box-shadow: 0 0 16px 5px rgba(234, 179, 8, 0.65), 0 0 30px 10px rgba(234, 179, 8, 0.3);
  transform: scale(1.3);
}
```

- [ ] **Step 4: Test in browser**

Start the dev server (`pnpm dev`) and verify:
- Map background is dark (Carto dark tiles)
- Person markers appear as gold glowing dots
- Hover shows enhanced glow
- Attribution is updated

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/MapView.tsx apps/web/src/components/PersonMarker.tsx apps/web/src/styles/app.css
git commit -m "feat(web): dark Carto map tiles and gold glow person markers"
```

---

### Task 15: Sidebar — Dark Theme + Search/Filter

**Files:**
- Modify: `apps/web/src/components/Sidebar.tsx`
- Modify: `apps/web/src/components/Sidebar.test.tsx`

- [ ] **Step 1: Update Sidebar tests to expect search input**

In `apps/web/src/components/Sidebar.test.tsx`, add a test for the search input:

```typescript
it('filters persons by name search', async () => {
  render(<Sidebar persons={mockPersons} selectedPerson={null} onSelectPerson={jest.fn()} />);
  const searchInput = screen.getByPlaceholderText(/search/i);
  await userEvent.type(searchInput, 'Alice');
  expect(screen.getByText('Alice')).toBeInTheDocument();
  // If 'Bob' exists in mockPersons, verify it's gone
});
```

Run:

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-web test -- --testPathPattern Sidebar
```

Expected: FAIL — no search input found.

- [ ] **Step 2: Update `apps/web/src/components/Sidebar.tsx`**

```typescript
import { useState, useMemo } from 'react';
import { Search, UserPlus } from 'lucide-react';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';
import { PersonCard } from './PersonCard';
import { PersonForm } from './PersonForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  persons: Person[];
  selectedPerson: Person | null;
  onSelectPerson: (person: Person | null) => void;
}

export function Sidebar({ persons, selectedPerson, onSelectPerson }: SidebarProps) {
  const [search, setSearch] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const { signOut, user } = useAuth();

  const filtered = useMemo(() => {
    return persons.filter((p) => {
      const matchesName = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.birthPlace ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesFrom = !yearFrom || (p.birthYear != null && p.birthYear >= Number(yearFrom));
      const matchesTo = !yearTo || (p.birthYear != null && p.birthYear <= Number(yearTo));
      return matchesName && matchesFrom && matchesTo;
    });
  }, [persons, search, yearFrom, yearTo]);

  return (
    <aside className="flex h-screen w-72 flex-shrink-0 flex-col glass-card rounded-none border-r border-[--border]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[--border] px-4 py-3">
        <h1 className="font-display text-lg font-semibold text-[--gold]">Atlas Lineage</h1>
        <div className="flex items-center gap-1">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <button type="button" className="btn-ghost p-1.5" aria-label="Add person">
                <UserPlus className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Person</DialogTitle>
              </DialogHeader>
              <PersonForm onSuccess={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
          <button
            type="button"
            className="btn-ghost p-1.5 text-xs"
            onClick={() => void signOut()}
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-[--border] px-3 py-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[--text-muted]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people…"
            className="input-glass w-full pl-8 text-xs py-1.5"
            aria-label="Search people"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            placeholder="From year"
            className="input-glass w-1/2 text-xs py-1.5"
            aria-label="Filter from birth year"
          />
          <input
            type="number"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
            placeholder="To year"
            className="input-glass w-1/2 text-xs py-1.5"
            aria-label="Filter to birth year"
          />
        </div>
      </div>

      {/* Person count */}
      <div className="px-4 py-2 text-xs text-[--text-muted]">
        {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
        {search || yearFrom || yearTo ? ` (filtered from ${persons.length})` : ''}
      </div>

      {/* Person list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-[--text-muted]">No people found</p>
          </div>
        ) : (
          filtered.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              isSelected={selectedPerson?.id === person.id}
              onSelect={onSelectPerson}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[--border] px-4 py-2">
        <p className="text-xs text-[--text-muted] truncate">{user?.email}</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Run Sidebar tests**

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-web test -- --testPathPattern Sidebar
```

Expected: All pass (including new search test).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/Sidebar.tsx apps/web/src/components/Sidebar.test.tsx
git commit -m "feat(web): dark-themed sidebar with name/birthPlace search and year range filter"
```

---

### Task 16: PersonCard Premium Redesign

**Files:**
- Modify: `apps/web/src/components/PersonCard.tsx`

- [ ] **Step 1: Read current `apps/web/src/components/PersonCard.tsx`**

Note the existing props interface (person, isSelected, onSelect) and all action handlers (edit, delete, view relationships).

- [ ] **Step 2: Rewrite `apps/web/src/components/PersonCard.tsx` with glass design**

```typescript
import { useState } from 'react';
import { Edit2, Trash2, GitBranch, MapPin } from 'lucide-react';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';
import { PersonForm } from './PersonForm';
import { RelationshipForm } from './RelationshipForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useDeletePerson } from '../hooks/usePersons';

interface PersonCardProps {
  person: Person;
  isSelected: boolean;
  onSelect: (person: Person | null) => void;
}

export function PersonCard({ person, isSelected, onSelect }: PersonCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const deletePerson = useDeletePerson();

  const lifespan = [
    person.birthYear ? `b. ${person.birthYear}` : null,
    person.deathYear ? `d. ${person.deathYear}` : null,
  ]
    .filter(Boolean)
    .join('  ');

  const handleDelete = () => {
    if (confirm(`Remove ${person.name}?`)) {
      deletePerson.mutate(person.id);
      if (isSelected) onSelect(null);
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(isSelected ? null : person)}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(isSelected ? null : person)}
        className={[
          'group glass-card cursor-pointer px-3 py-2.5 transition-all duration-150',
          isSelected
            ? 'glass-card-gold ring-1 ring-[--border-gold]'
            : 'hover:border-[--border-gold]/50',
        ].join(' ')}
      >
        {/* Name */}
        <p className="font-display text-sm font-semibold leading-snug text-[--text-primary] truncate">
          {person.name}
        </p>

        {/* Lifespan */}
        {lifespan && (
          <p className="mt-0.5 text-xs text-[--text-muted]">{lifespan}</p>
        )}

        {/* Birth place */}
        {person.birthPlace && (
          <div className="mt-1 flex items-center gap-1 text-xs text-[--text-secondary]">
            <MapPin className="h-3 w-3 flex-shrink-0 text-[--gold]" aria-hidden="true" />
            <span className="truncate">{person.birthPlace}</span>
          </div>
        )}

        {/* Actions — visible on hover / selected */}
        <div className={[
          'mt-2 flex items-center gap-1 transition-opacity duration-150',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
            className="btn-ghost p-1 text-[--text-muted] hover:text-[--gold]"
            aria-label={`Edit ${person.name}`}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setRelOpen(true); }}
            className="btn-ghost p-1 text-[--text-muted] hover:text-[--gold]"
            aria-label={`Manage relationships for ${person.name}`}
          >
            <GitBranch className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="btn-ghost p-1 text-[--text-muted] hover:text-[--color-error] ml-auto"
            aria-label={`Delete ${person.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Edit Person</DialogTitle>
          </DialogHeader>
          <PersonForm person={person} onSuccess={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={relOpen} onOpenChange={setRelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Relationships — {person.name}</DialogTitle>
          </DialogHeader>
          <RelationshipForm person={person} />
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 3: Run all web tests**

```bash
pnpm --filter @wongsorn-labs/atlas-lineage-web test
```

Expected: All 17+ tests pass.

- [ ] **Step 4: Test visually in browser**

Start `pnpm dev` and verify:
- PersonCard has glass background with backdrop blur
- Name uses Playfair Display
- Actions appear on hover with gold tint
- Selected card has gold border ring

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/PersonCard.tsx
git commit -m "feat(web): premium glass PersonCard with Playfair Display and gold hover actions"
```

---

### Task 17: Full Test Run + Final Commit

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: API and Web suites pass. (DB tests require live PostgreSQL; skip or run with container up.)

- [ ] **Step 2: Start the app and do a full manual smoke test**

```bash
pnpm dev
```

Verify:
1. Open `http://localhost:5173` — LoginPage shown with dark glass design
2. Enter credentials — redirected to main app
3. Map shows dark tiles with gold markers
4. Sidebar search filters the list
5. PersonCard hover shows gold actions
6. Add/edit/delete a person — TanStack Query invalidates and re-renders
7. Refresh page — auth cookie persists, no login redirect
8. Click sign out — LoginPage shown

- [ ] **Step 3: Final commit if any tweaks were made**

```bash
git add -p
git commit -m "chore(web): phase 1 polish and smoke test fixes"
```

- [ ] **Step 4: Push branch**

```bash
git push -u origin worktree-atlas-lineage-phase1
```

Then open a PR from `worktree-atlas-lineage-phase1` → `develop`.
