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

# Run all unit/integration tests
pnpm test

# Run a single package's tests
pnpm --filter @wongsorn-labs/atlas-lineage-api test
pnpm --filter @wongsorn-labs/atlas-lineage-web test
pnpm --filter @wongsorn-labs/atlas-lineage-db  test

# Run a single test file (e.g. within apps/api)
cd apps/api && pnpm exec jest src/persons/persons.service.spec.ts

# Run with coverage
pnpm test:cov

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
- **`packages/db`** exports plain functions (`findAllPersons`, `createPerson`, etc.) used directly by NestJS services. The Drizzle client is a singleton created in `src/client.ts`; it reads `DATABASE_PATH` at import time.
- **`apps/api`** uses NestJS modules (`PersonsModule`, `RelationshipsModule`). Services call `packages/db` functions; controllers handle HTTP. All routes are prefixed `/api`. Validation is done with `class-validator` DTOs and a global `ValidationPipe`.
- **`apps/web`** fetches all data through `src/api/client.ts` (a thin `fetch` wrapper). TanStack Query hooks in `src/hooks/` own cache invalidation. The Sidebar and MapView receive data from the root `App.tsx` component which calls `usePersons` and `useRelationships`.

### Field encryption

`birthPlace` and `notes` on every `Person` are encrypted at rest using AES-256-GCM (`packages/db/src/crypto.ts`). `encryptField` / `decryptField` are called inside every query function in `packages/db/src/queries/persons.ts`. Null and empty-string inputs are stored as SQL NULL without encryption. The `ENCRYPTION_KEY` env var must be present whenever the db package reads or writes data.

### Map rendering

`MapView` uses `react-leaflet`. Only persons with non-null `birthLat`/`birthLng` are rendered as markers. `RelationshipLines` draws Leaflet `Polyline` elements between paired persons that both have coordinates. The Leaflet default icon path fix (deleting `_getIconUrl` and calling `L.Icon.Default.mergeOptions`) is required because Vite breaks the bundled image paths — this is intentional, not a bug.

### i18n

The app supports English (`en`) and Thai (`th`) via `react-i18next`. Locale files live in `apps/web/src/i18n/locales/`. The active language is persisted to `localStorage` under the key `lang`.

### Testing conventions

- **API & DB**: Jest + ts-jest. Test files use the `.spec.ts` suffix. NestJS services are tested with `@nestjs/testing`; the db module is mocked with `jest.mock`.
- **Web**: Vitest + React Testing Library + jsdom. MSW (`src/test/mocks/`) intercepts fetch calls.
- **E2E**: Playwright. Tests live in `apps/e2e/tests/`. The config spins up both the API and web dev servers.

### PWA

The web app is a PWA via `vite-plugin-pwa`. Service worker registration is in `src/pwa/registerSW.ts`.
