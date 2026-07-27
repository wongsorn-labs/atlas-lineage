# Atlas Lineage

A map-based genealogy app. Persons are placed on a Leaflet world map by birth
coordinates; parent-child and other relationships are drawn as lines between
markers. Supports multi-tenant family trees with owner/editor/viewer roles,
Google/email sign-in, a light/dark theme, and a per-account default map view.

## Tech stack

- **API**: NestJS + PostgreSQL via Drizzle ORM (`apps/api`, `packages/db`)
- **Web**: React 19 + Vite, Tailwind CSS v4, Base UI (`apps/web`)
- **Shared**: Zod schemas and TypeScript types (`packages/shared`)
- **Auth**: Supabase (email/password + Google OAuth), httpOnly cookie sessions
- **Map**: react-leaflet + CARTO tiles (light/dark, theme-aware)
- **E2E**: Playwright (`apps/e2e`)

## Quick start

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # fill in DATABASE_URL, ENCRYPTION_KEY, etc.
pnpm db:migrate
pnpm dev                                  # API on :3001, web on :5173
```

## Common commands

```bash
pnpm build       # build the web app for production
pnpm test        # run all unit/integration tests
pnpm test:e2e    # Playwright e2e (starts both servers automatically)
pnpm db:generate # generate a migration from schema changes
pnpm db:migrate  # apply migrations
```

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — architecture, environment setup, commit conventions, full command reference
- [`openspec/specs/`](./openspec/specs/) — capability specs describing current system behavior (source of truth when they disagree with prose docs)
