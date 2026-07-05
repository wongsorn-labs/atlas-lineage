# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Atlas Lineage is a map-based genealogy app. Persons are placed on a Leaflet world map by birth coordinates; parent-child and other relationships are drawn as lines between markers. The stack is a pnpm monorepo with a NestJS REST API backed by **PostgreSQL** via Drizzle ORM, and a React + Vite frontend.

## Workspace Layout

```
packages/shared   – Zod schemas and TypeScript types shared by all packages
packages/db       – Drizzle ORM schema, queries, and AES-256-GCM field encryption
apps/api          – NestJS REST API (port 3001)
apps/web          – React 19 + Vite SPA (port 5173)
apps/e2e          – Playwright end-to-end tests
api/index.ts      – Vercel serverless entry point (wraps NestJS app)
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

# Run all unit + e2e tests
pnpm test:all

# End-to-end tests only (starts both servers automatically)
pnpm test:e2e

# Database migrations
pnpm db:generate   # generate SQL from schema changes
pnpm db:migrate    # apply migrations
```

## Environment Setup

Create `apps/api/.env` (see `apps/api/.env.example` as a starting point — note it is outdated and still references the old SQLite variable `DATABASE_PATH`; use `DATABASE_URL` instead):

| Variable         | Description                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/atlas_lineage`                                            |
| `ENCRYPTION_KEY` | 64-char hex string (32 bytes) for AES-256-GCM. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PORT`           | API port, default `3001`.                                                                                                           |
| `CORS_ORIGIN`    | Comma-separated allowed origins for CORS. Defaults to `http://localhost:5173` when unset.                                           |

> **Note:** `apps/api/.env.example` and `apps/e2e/playwright.config.ts` still reference the legacy `DATABASE_PATH` / SQLite variables — they have not been updated since the migration to PostgreSQL. Use `DATABASE_URL` as the authoritative variable name.

## Architecture

### Data flow

```
packages/shared  ──►  packages/db  ──►  apps/api  ──►  apps/web
(types + Zod)        (queries)          (NestJS)        (React + TanStack Query)
```

- **`packages/shared`** is the single source of truth for TypeScript types (`Person`, `Relationship`, `RelationshipType`) and Zod validation schemas. Both the API DTOs and the web forms derive from this package.
- **`packages/db`** exports plain functions (`findAllPersons`, `createPerson`, etc.) used directly by NestJS services. The Drizzle client is a singleton in `src/client.ts`; it reads `DATABASE_URL` (PostgreSQL) at import time. Schema lives in `src/schema.ts` (pg tables: `persons`, `relationships`). Migrations live in `drizzle/`.
- **`apps/api`** uses NestJS modules (`PersonsModule`, `RelationshipsModule`). Services call `packages/db` functions; controllers handle HTTP. All routes are prefixed `/api`. Validation is done with `class-validator` DTOs and a global `ValidationPipe`. A global `HttpExceptionFilter` normalises error responses to `{ statusCode, message }`.
- **`apps/web`** fetches all data through `src/api/client.ts` (a thin `fetch` wrapper). TanStack Query hooks in `src/hooks/` own cache invalidation. The Sidebar and MapView receive data from the root `App.tsx` component which calls `usePersons` and `useRelationships`.

### Database schema

Managed by Drizzle ORM against PostgreSQL (`drizzle-orm/node-postgres`).

```
persons         – id (serial PK), name, birth_year, death_year, birth_lat, birth_lng,
                  birth_place (encrypted), notes (encrypted), created_at, updated_at
relationships   – id (serial PK), person_id (FK→persons cascade), related_person_id (FK→persons cascade),
                  type, created_at
```

### Field encryption

`birthPlace` and `notes` on every `Person` are encrypted at rest using AES-256-GCM (`packages/db/src/crypto.ts`). The encrypted format is `"iv:authTag:ciphertext"` (all hex). `encryptField` / `decryptField` are called inside every query function in `packages/db/src/queries/persons.ts`. Null and empty-string inputs are stored as SQL NULL without encryption. The `ENCRYPTION_KEY` env var must be present whenever the db package reads or writes data.

### API endpoints

| Method | Path                                  | Description                                  |
| ------ | ------------------------------------- | -------------------------------------------- |
| GET    | `/api/health`                         | Health check → `{ status: 'ok', timestamp }` |
| GET    | `/api/persons`                        | List all persons                             |
| GET    | `/api/persons/:id`                    | Get person by id                             |
| POST   | `/api/persons`                        | Create person                                |
| PATCH  | `/api/persons/:id`                    | Update person                                |
| DELETE | `/api/persons/:id`                    | Delete person                                |
| GET    | `/api/relationships`                  | List all relationships                       |
| GET    | `/api/relationships/person/:personId` | Relationships for a person                   |
| POST   | `/api/relationships`                  | Create relationship                          |
| DELETE | `/api/relationships/:id`              | Delete relationship                          |

### Map rendering

`MapView` uses `react-leaflet`. Only persons with non-null `birthLat`/`birthLng` are rendered as markers. `RelationshipLines` draws Leaflet `Polyline` elements between paired persons that both have coordinates. The Leaflet default icon path fix (deleting `_getIconUrl` and calling `L.Icon.Default.mergeOptions`) is required because Vite breaks the bundled image paths — this is intentional, not a bug.

### UI stack

The web frontend uses **Tailwind CSS** for styling and **Radix UI** primitives (via a local shadcn/ui-style component library under `apps/web/src/components/ui/`). Forms use **React Hook Form** with Zod resolvers (from `packages/shared`). The `@` alias maps to `apps/web/src/` in both Vite and Vitest configs.

### i18n

The app supports English (`en`) and Thai (`th`) via `react-i18next`. Locale files live in `apps/web/src/i18n/locales/`. The active language is persisted to `localStorage` under the key `lang`.

### PWA

The web app is a PWA via `vite-plugin-pwa`. Service worker registration is in `src/pwa/registerSW.ts`. The manifest is defined in `apps/web/vite.config.ts` with app name "Atlas Lineage", theme color `#1e40af`, and 192×512 icons.

### Testing conventions

- **API & DB**: Jest + ts-jest. Test files use the `.spec.ts` suffix. NestJS services are tested with `@nestjs/testing`; the db module is mocked with `jest.mock`.
- **Web**: Vitest + React Testing Library + jsdom. MSW (`src/test/mocks/`) intercepts fetch calls. Setup file: `src/test/setup.ts`.
- **E2E**: Playwright. Tests live in `apps/e2e/tests/`. The config spins up both the API and web dev servers. `global-setup.ts` runs migrations before the suite. Note: the e2e config currently passes the legacy `DATABASE_PATH` env var; update it to `DATABASE_URL` when running e2e against PostgreSQL.

### PWA

The web app is a PWA via `vite-plugin-pwa`. Service worker registration is in `src/pwa/registerSW.ts`. Icons at 192×192 and 512×512, theme colour `#1e40af`.

## Spec-Driven Development (OpenSpec)

This repo uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven development. Capability specs describing current system behavior live in `openspec/specs/<capability>/spec.md` (authentication, family-tree-management, field-encryption, localization, map-visualization, person-management, pwa-support, relationship-management). These specs are the baseline source of truth for behavior — treat `CLAUDE.md`'s architecture prose as a secondary summary, and the specs as canonical when they disagree.

`openspec/capabilities.yaml` is a status tracker layered on top of the specs (implementation status, linked GitHub issues) that OpenSpec itself doesn't capture — see "Capability status" below.

Workflow for new work:
1. `/opsx:propose "<idea>"` (or `openspec new change <name>`) to start a change — writes `openspec/changes/<name>/proposal.md` plus delta specs under `specs/**/*.md` using `## ADDED/MODIFIED/REMOVED/RENAMED Requirements`.
2. Implement against `design.md`/`tasks.md` if generated.
3. `openspec archive <name>` folds the delta specs into `openspec/specs/` and moves the change to `openspec/changes/archive/`.
4. Update `openspec/capabilities.yaml`: add new capabilities, bump `requirements` counts, and flip `status` (`implemented`/`gap`/`in-progress`/`planned`) to match what was just archived. This step is manual — the OpenSpec CLI has no hook to do it automatically.

Run `openspec validate --all` after editing any spec (requirements need SHALL/MUST language and at least one `#### Scenario:` block each). Slash commands live under `.claude/commands/opsx/`; skills under `.claude/skills/`.

### Capability status

`openspec/capabilities.yaml` tracks, per capability: requirement count, `status`, and any linked GitHub issues/notes for known gaps. As of the last update, 7 of 8 capabilities are `implemented`; `family-tree-management` is `gap` (role enforcement defined but not wired into the persons/relationships endpoints — tracked in issue #9).

The app is deployed on **Vercel** (`vercel.json`):

- **Web**: Built with `pnpm --filter @wongsorn-labs/atlas-lineage-web build`; output from `apps/web/dist`.
- **API**: `api/index.ts` is the serverless function entry. It bootstraps NestJS once per cold start and caches the app instance for warm invocations. Memory: 1 024 MB, max duration: 10 s. Drizzle migration files (`packages/db/drizzle/**`) are bundled via `includeFiles`.
- **Routing**: `/api/*` rewrites to `api/index`; all other paths rewrite to `index.html`.

## CI/CD

GitHub Actions (`.github/workflows/test.yml`):

- **Triggers**: push to `main`, `master`, `claude/**`; pull requests targeting `main` or `master`.
- **Runtime**: Node 22, pnpm 10.
- **Steps**: install → test DB with coverage → test API with coverage → test Web with coverage → upload coverage artifacts (14-day retention).
- E2E tests are **not** run in CI (no PostgreSQL service is provisioned in the workflow).

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

## Agent Workflow Conventions

- **UI changes**: Whenever a change touches `apps/web` UI (components, pages, styles), capture a before/after screenshot pair and send both to the user for comparison. Prefer driving the real app (dev servers + a browser, or a throwaway Playwright script) over describing the change in words only — seed the same test data for both captures so the comparison is apples-to-apples. Clean up any throwaway script/spec file afterward; don't commit it.
- **Service/flow changes**: Whenever a change alters a service's control flow, request/data flow, or architecture (e.g. new API call sequence, changed auth flow, restructured data pipeline), produce a before/after diagram (e.g. Mermaid) illustrating the flow difference, in addition to the code diff.

## Agent-Specific Guidance

- **Claude Code** (claude.ai/code): See this file (CLAUDE.md)
- **VS Code Copilot**: See copilot-instructions.md
- **Other AI Agents**: See AGENTS.md (shared guidelines)
