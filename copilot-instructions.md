# copilot-instructions.md

Guidance for VS Code Copilot working with **Atlas Lineage**.

For detailed architecture and setup, see [CLAUDE.md](CLAUDE.md).  
For shared agent guidelines, see [AGENTS.md](AGENTS.md).

## Quick Start

1. **Install deps:** `pnpm install`
2. **Run dev:** `pnpm dev` (starts API + web)
3. **Run tests:** `pnpm test` (all unit/integration)
4. **Run e2e:** `pnpm test:e2e` (Playwright)

## Commit Messages

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

**Valid types:** `feat`, `fix`, `test`, `refactor`, `docs`, `perf`, `chore`, `ci`, `style`

**Valid scopes:** `api`, `web`, `db`, `e2e`, `shared`

**Rules:**
- Type is lowercase and must be one of the valid types above
- Scope is always required (wrapped in parentheses)
- Subject is imperative mood, lowercase, no period, max 50 chars
- No blank line between type/scope and subject
- Commits failing validation are rejected by lefthook

**Examples:**
```bash
feat(api): add person search endpoint
fix(web): correct map marker positioning
test(db): add encryption edge cases
refactor(shared): simplify Zod schema validation
```

**⚠️ IMPORTANT FOR CODE GENERATION:** When asked to generate, commit, or suggest commit messages, ALWAYS output them in the exact format above. Never suggest messages like "add new feature" or "fix bug" — they will be rejected. Always include type, scope in parentheses, and lowercase subject.

## Core Packages

| Package | Role |
|---------|------|
| `packages/shared` | TypeScript types + Zod schemas (source of truth) |
| `packages/db` | Drizzle ORM, AES-256-GCM encryption |
| `apps/api` | NestJS REST API |
| `apps/web` | React 19 + Vite SPA |
| `apps/e2e` | Playwright end-to-end tests |

## Before Suggesting Changes

- ✅ **Check:** Does the change align with the monorepo architecture?
- ✅ **Check:** Are types defined in `packages/shared` first?
- ✅ **Check:** Does the API follow NestJS module patterns?
- ✅ **Check:** Will this require a database migration?

## Testing

Always run tests before committing:
```bash
pnpm test       # unit + integration (all packages)
pnpm test:cov   # with coverage reports
pnpm test:e2e   # end-to-end tests
```

Test files use `.spec.ts` suffix (Jest/Vitest).

## Field Encryption

`birthPlace` and `notes` on `Person` are encrypted at rest (AES-256-GCM).
- Never hardcode encryption logic; use `packages/db/src/crypto.ts`
- Set `ENCRYPTION_KEY` env var (64-char hex, 32 bytes)
- Null/empty strings stored as SQL NULL (not encrypted)

## Formatting & Style

- **TypeScript:** Strict mode, no `any`
- **React:** Functional components + hooks
- **CSS:** TailwindCSS (web app)
- **Linting:** ESLint/Prettier (inherited from workspace config)

---

**More details?** See [CLAUDE.md](CLAUDE.md) for full architecture and environment setup.
