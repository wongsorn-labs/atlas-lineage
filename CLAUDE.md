# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Atlas Lineage is a map-based genealogy app. Persons are placed on a Leaflet world map by birth coordinates; parent-child and other relationships are drawn as lines between markers. The stack is a pnpm monorepo with a NestJS REST API backed by SQLite via Drizzle ORM, and a React + Vite frontend.

## Workspace Layout

```
packages/shared   – Zod schemas and TypeScript types shared by all packages
packages/db       – Drizzle ORM schema, queries, and AES-256-GCM field encryption
apps/api          – NestJS REST API (port 3001)
apps/web          – React 19 + Vite SPA (port 5173)
apps/e2e          – Playwright end-to-end tests
```

## Commands

All commands are run from the repo root unless noted.

```bash
# Install dependencies
pnpm install

# Run API + web concurrently
pnpm dev

# Build web for production
pnpm build

# Run all unit/integration tests (db → api → web order)
pnpm test

# Run a single package's tests
pnpm --filter @wongsorn-labs/atlas-lineage-api test
pnpm --filter @wongsorn-labs/atlas-lineage-web test
pnpm --filter @wongsorn-labs/atlas-lineage-db  test

# Run a single test file (e.g. within apps/api)
cd apps/api && pnpm exec jest src/persons/persons.service.spec.ts

# Run with coverage
pnpm test:cov

# Run all tests including e2e
pnpm test:all

# End-to-end tests (starts both servers automatically)
pnpm test:e2e

# Database migrations
pnpm db:generate   # generate SQL from schema changes
pnpm db:migrate    # apply migrations
```

## Environment Setup

Copy `apps/api/.env.example` to `apps/api/.env` and fill in:

| Variable | Description |
|---|---|
| `ENCRYPTION_KEY` | 64-char hex string (32 bytes) for AES-256-GCM. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_PATH` | Path to the SQLite file, relative to `apps/api/`. Default resolves to `atlas-lineage.db` at the repo root. |
| `PORT` | API port, default `3001`. |

The e2e suite reads `apps/api/.env` and uses a separate `atlas-lineage.test.db` so it never touches the dev database.

## Architecture

### Data flow

```
packages/shared  ──►  packages/db  ──►  apps/api  ──►  apps/web
(types + Zod)        (queries)          (NestJS)        (React + TanStack Query)
```

- **`packages/shared`** is the single source of truth for TypeScript types (`Person`, `Relationship`, `RelationshipType`) and Zod validation schemas. Both the API DTOs and the web forms derive from this package.
- **`packages/db`** exports plain functions (`findAllPersons`, `createPerson`, etc.) used directly by NestJS services. The Drizzle client is a singleton in `src/client.ts`; it reads `DATABASE_PATH` at import time and opens the SQLite file at that path.
- **`apps/api`** uses NestJS modules (`PersonsModule`, `RelationshipsModule`). Services call `packages/db` functions; controllers handle HTTP. All routes are prefixed `/api`. Validation uses `class-validator` DTOs and a global `ValidationPipe`. CORS is hardcoded to `http://localhost:5173` in development.
- **`apps/web`** fetches all data through `src/api/client.ts` (a thin `fetch` wrapper). TanStack Query hooks in `src/hooks/` own cache invalidation. The Sidebar and MapView receive data from the root `App.tsx` component which calls `usePersons` and `useRelationships`.

### Module structure

**`packages/shared/src/`**
- `types.ts` — `Person`, `Relationship`, `RelationshipType`, `CreatePersonInput`, `UpdatePersonInput`, `CreateRelationshipInput`
- `schemas.ts` — Zod schemas: `CreatePersonSchema`, `UpdatePersonSchema`, `CreateRelationshipSchema`, `RelationshipTypeSchema`

**`packages/db/src/`**
- `schema.ts` — Drizzle table definitions (`persons`, `relationships` with FK cascade-delete)
- `client.ts` — Drizzle singleton using `better-sqlite3`; reads `DATABASE_PATH` env var
- `crypto.ts` — AES-256-GCM encrypt/decrypt; stores as `IV:authTag:ciphertext` (hex)
- `queries/persons.ts` — `findAllPersons`, `findPersonById`, `createPerson`, `updatePerson`, `deletePerson`
- `queries/relationships.ts` — `findAllRelationships`, `findRelationshipsByPerson`, `createRelationship`, `deleteRelationship`

**`apps/api/src/`**
- `main.ts` — bootstrap: global prefix `/api`, `ValidationPipe`, `HttpExceptionFilter`, CORS, port
- `app.module.ts` — root module importing `PersonsModule` and `RelationshipsModule`
- `health.controller.ts` — `GET /api/health`
- `persons/` — controller (`GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`), service, DTOs
- `relationships/` — controller (`GET /`, `GET /person/:personId`, `POST /`, `DELETE /:id`), service, DTO
- `common/filters/http-exception.filter.ts` — global error handler returning `{statusCode, message}`

**`apps/web/src/`**
- `App.tsx` — root component; calls `usePersons` + `useRelationships`; owns `selectedPerson` state; renders `<Sidebar>` + `<MapView>`
- `api/client.ts` — typed fetch wrapper; namespaces `api.persons` and `api.relationships`
- `hooks/usePersons.ts` — TanStack Query CRUD hooks with automatic cache invalidation
- `hooks/useRelationships.ts` — TanStack Query CRUD hooks
- `components/MapView.tsx` — `react-leaflet` map; renders `PersonMarker` + `RelationshipLines`
- `components/PersonMarker.tsx` — individual Leaflet marker with click handler
- `components/RelationshipLines.tsx` — Leaflet `Polyline` between coordinate-bearing persons
- `components/Sidebar.tsx` — person list, language toggle, add-person dialog
- `components/PersonCard.tsx` — selected person detail, edit/delete, relationships list
- `components/PersonForm.tsx` — React Hook Form + Zod for create/edit
- `components/RelationshipForm.tsx` — dropdowns to pick related person and type
- `components/ui/` — Shadcn-style primitives (button, card, dialog, badge, input, label, select, textarea)
- `i18n/` — `react-i18next` config; locales for `en` and `th`
- `pwa/registerSW.ts` — service worker registration via `vite-plugin-pwa`
- `test/mocks/` — MSW handlers and server for unit tests

### Field encryption

`birthPlace` and `notes` on every `Person` are encrypted at rest using AES-256-GCM (`packages/db/src/crypto.ts`). `encryptField` / `decryptField` are called inside every query function in `packages/db/src/queries/persons.ts`. Null and empty-string inputs are stored as SQL NULL without encryption. The `ENCRYPTION_KEY` env var must be present whenever the db package reads or writes data.

### Map rendering

`MapView` uses `react-leaflet`. Only persons with non-null `birthLat`/`birthLng` are rendered as markers. `RelationshipLines` draws Leaflet `Polyline` elements between paired persons that both have coordinates. The Leaflet default icon path fix (deleting `_getIconUrl` and calling `L.Icon.Default.mergeOptions`) is required because Vite breaks the bundled image paths — this is intentional, not a bug.

### i18n

The app supports English (`en`) and Thai (`th`) via `react-i18next`. Locale files live in `apps/web/src/i18n/locales/`. The active language is persisted to `localStorage` under the key `lang`.

### PWA

The web app is a PWA via `vite-plugin-pwa`. Service worker registration is in `src/pwa/registerSW.ts`. The manifest is defined in `apps/web/vite.config.ts` with app name "Atlas Lineage", theme color `#1e40af`, and 192×512 icons.

### Testing conventions

- **API & DB**: Jest + ts-jest. Test files use the `.spec.ts` suffix. NestJS services are tested with `@nestjs/testing`; the db module is mocked with `jest.mock`.
- **Web**: Vitest + React Testing Library + jsdom. MSW (`src/test/mocks/`) intercepts fetch calls.
- **E2E**: Playwright. Tests live in `apps/e2e/tests/`. The config spins up both the API and web dev servers. `global-setup.ts` runs `pnpm db:migrate` against `atlas-lineage.test.db` before any test runs. `workers: 1` enforces serial execution.

### TypeScript configuration

- `tsconfig.base.json` at root — `ES2022`, `strict`, `CommonJS`, source + declaration maps
- `apps/api/tsconfig.json` — extends base; adds `experimentalDecorators` + `emitDecoratorMetadata` (required by NestJS)
- `apps/web/tsconfig.json` — `ESNext` modules, `react-jsx`, alias `@/*` → `./src/*`
- Path aliases in API and web tsconfigs map `@wongsorn-labs/atlas-lineage-shared` and `@wongsorn-labs/atlas-lineage-db` to their local source

## Git Branching Workflow

- **`develop`** is the integration branch. All feature branches must be created from `develop` and merged back into `develop` via PR.
- **`main`** is the production branch. Only merge from `develop` when cutting a release.
- **Never** branch directly from `main` for new features or fixes.

```bash
# Correct workflow for a new branch
git fetch origin develop
git checkout -b feat/my-feature origin/develop
# ... commit work ...
git push -u origin feat/my-feature
# Open PR targeting develop
```

## Commit Conventions

This repo enforces [Conventional Commits](https://www.conventionalcommits.org/) via **commitlint** and **lefthook**.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type** (required): `feat`, `fix`, `test`, `refactor`, `docs`, `perf`, `chore`, `ci`, `style`

**Scope** (required): `api`, `web`, `db`, `e2e`, `shared`, or the package/area affected

**Subject** (required): Imperative, lowercase, no period, ≤50 chars

**Examples:**
```bash
feat(api): add person search endpoint
fix(web): correct map marker positioning on mobile
test(db): add encryption edge cases
refactor(shared): simplify Zod schema validation
docs(web): update i18n locale keys
ci: update GitHub Actions workflow
```

**Enforcement:** Commits not matching the pattern are rejected by the `commit-msg` lefthook. Use `git commit -m "type(scope): message"`.

## Agent-Specific Guidance

- **Claude Code** (claude.ai/code): See this file (CLAUDE.md)
- **VS Code Copilot**: See copilot-instructions.md
- **Other AI Agents**: See AGENTS.md (shared guidelines)
