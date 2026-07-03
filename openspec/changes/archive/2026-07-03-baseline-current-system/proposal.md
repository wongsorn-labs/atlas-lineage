## Why

Atlas Lineage has been built for several iterations (persons/relationships, PostgreSQL migration, Vercel deployment, Supabase auth, family trees) without any spec layer. There is no single source of truth for what the system actually does today, so `openspec/specs/` is empty and future changes have nothing to diff against. This change reverse-engineers the current, deployed behavior of the codebase into baseline OpenSpec capability specs — it captures reality (including known gaps), not aspirations.

## What Changes

- Document the current behavior of every user-facing and cross-cutting capability as OpenSpec specs, derived directly from the code in `apps/api`, `apps/web`, and `packages/*` (not from `CLAUDE.md`, which is stale — e.g. it omits auth and family trees entirely).
- No application code changes. This is a documentation-only baseline capture.
- Capture one known gap explicitly rather than silently: `TreeMemberGuard` and the `owner/editor/viewer` role hierarchy are implemented but never wired into any controller via `@UseGuards`, and `persons`/`relationships` queries never filter by `treeId`. Today, any authenticated user can read/write all persons and relationships regardless of family tree membership.

## Capabilities

**New Capabilities:**
- `person-management` — CRUD for person records (name, birth/death year, birth coordinates, encrypted birth place/notes)
- `relationship-management` — CRUD for typed relationship edges between two persons
- `field-encryption` — AES-256-GCM at-rest encryption of `birthPlace`/`notes`
- `map-visualization` — Leaflet world map rendering of persons and relationship lines
- `authentication` — Supabase-backed email/password + Google OAuth sign-in with httpOnly cookie sessions
- `family-tree-management` — family trees, membership, and roles (owner/editor/viewer) — including the current enforcement gap
- `localization` — English/Thai UI translation with persisted language preference
- `pwa-support` — installable PWA via service worker and web manifest

**Modified Capabilities:** none (no existing specs yet)

## Impact

- Affected: none at runtime — this change only adds `openspec/specs/**`.
- Establishes the baseline that subsequent `openspec change` proposals will diff against.
