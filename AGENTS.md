# AGENTS.md

Shared guidance for all AI agents working with **Atlas Lineage**.  
For agent-specific guidance, see CLAUDE.md (Claude Code) or copilot-instructions.md (VS Code Copilot).

## Overview

Atlas Lineage is a pnpm monorepo: map-based genealogy app with NestJS REST API, React frontend, and Drizzle ORM.

**Key files to know:**
- [CLAUDE.md](CLAUDE.md) — detailed architecture, commands, environment setup
- `packages/shared/` — TypeScript types and Zod schemas (source of truth)
- `packages/db/` — Drizzle queries and encryption
- `apps/api/` — NestJS REST API
- `apps/web/` — React 19 + Vite SPA
- `apps/e2e/` — Playwright end-to-end tests

## Workflows

### Install & Run
```bash
pnpm install           # monorepo setup
pnpm dev               # API + web concurrently
pnpm test              # all unit/integration tests
pnpm test:e2e          # end-to-end tests
pnpm build             # production web build
```

### Database
```bash
pnpm db:generate       # Drizzle SQL from schema
pnpm db:migrate        # apply migrations
```

### Single Package Tests
```bash
pnpm --filter @wongsorn-labs/atlas-lineage-api test
pnpm --filter @wongsorn-labs/atlas-lineage-web test
pnpm --filter @wongsorn-labs/atlas-lineage-db test
```

## Commit Message Format

**Enforce via commitlint + lefthook** — all commits must match:
```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `test`, `refactor`, `docs`, `perf`, `chore`, `ci`, `style`

**Scopes:** `api`, `web`, `db`, `e2e`, or specific package name

**Examples:**
```bash
feat(api): add person search endpoint
fix(web): correct map marker positioning
test(db): add encryption edge cases
ci: update GitHub Actions workflow
```

Invalid commits are rejected. Always use conventional format.

## Architecture

| Package | Purpose |
|---------|---------|
| `packages/shared` | TypeScript types, Zod schemas (shared by all) |
| `packages/db` | Drizzle ORM queries, AES-256-GCM encryption |
| `apps/api` | NestJS REST API (port 3001) |
| `apps/web` | React 19 + Vite SPA (port 5173) |
| `apps/e2e` | Playwright end-to-end tests |

**Data flow:**
```
packages/shared → packages/db → apps/api → apps/web
(types + Zod)   (queries)      (NestJS)    (React + TanStack Query)
```

## Testing

- **API & DB**: Jest + ts-jest (`.spec.ts` files, NestJS testing module)
- **Web**: Vitest + React Testing Library (jsdom, MSW mocks)
- **E2E**: Playwright (auto-starts both servers)

Test before committing. Run `pnpm test` to verify everything passes.

## Field Encryption

`birthPlace` and `notes` on `Person` are encrypted at rest using AES-256-GCM.
- Encryption/decryption happens in `packages/db/src/queries/persons.ts`
- `ENCRYPTION_KEY` env var must be set (64-char hex string)
- Null and empty strings stored as SQL NULL (not encrypted)

## Gotchas

- **Relationship direction**: a `Relationship` row's `type` describes `personId`'s role toward `relatedPersonId` (e.g. `{personId: A, relatedPersonId: B, type: 'parent'}` = A is B's parent). No reciprocal row is auto-created. UI that renders a relationship from either person's side must invert `parent`↔`child` when displaying from the `personId` side — see `INVERSE_TYPE` in `apps/web/src/components/PersonCard.tsx` and the fuller note in CLAUDE.md.
- **Mobile full-height layout**: use `h-dvh`, not `h-screen`, for anything meant to fill the visible viewport — `100vh` on mobile Safari/Chrome includes the address bar and clips fixed-height content.

## Code Style

- **TypeScript**: Strict mode, no `any`
- **React**: Functional components, hooks
- **NestJS**: Module structure, dependency injection
- **CSS**: TailwindCSS (web) or inline styles
- **Formatting**: Prettier (config inherited from workspace)

## Before You Commit

1. Run `pnpm test` — all tests must pass
2. Follow commit message format (enforced by commitlint)
3. For API changes: update `packages/shared` types first
4. For DB changes: run `pnpm db:generate` to create SQL migration
5. For breaking changes: note in commit body

---

**Questions?** See [CLAUDE.md](CLAUDE.md) for detailed architecture notes.
