# Atlas Lineage — Phase 1 Design Spec

**Date:** 2026-06-07  
**Status:** Approved  
**Scope:** Phase 1 of 4 — Foundation

---

## Overview

Atlas Lineage is a map-based genealogy app for family collaboration. Multiple family members can contribute to a shared family tree. Persons are placed on a Leaflet world map by birth coordinates; relationships are drawn as lines between markers.

This spec covers Phase 1 only: infrastructure, authentication, dark UI redesign, and search. Phases 2–4 (Family Tree view, Timeline, Rich Profiles, GEDCOM, Invite/Sharing) are separate spec cycles.

---

## Phase 1 Scope

### In Scope

- **Docker Compose** — local PostgreSQL only; DBeaver connects to `localhost:5432`
- **Supabase** — production PostgreSQL + Auth (replaces manual DB hosting)
- **Authentication** — email/password + Google OAuth via Supabase Auth
- **HTTP-only cookie sessions** — access token + refresh token, names configurable via env
- **NestJS JWT guard** — validates Supabase Auth tokens from cookie
- **Role-based access** — Owner / Editor / Viewer per family tree
- **Dark UI redesign** — Premium Liquid Glass theme, gold accent, Playfair Display headings
- **Adaptive layout** — desktop: icon rail + sidebar + map; mobile: top header + bottom tabs
- **Search/filter** — sidebar search by name, birth year, birth place

### Out of Scope (Later Phases)

| Feature | Phase |
|---------|-------|
| Family Tree (pedigree) view | 2 |
| Timeline view | 2 |
| Photo upload / rich person events | 3 |
| GEDCOM import / export | 4 |
| Invite by email / share links | 4 |

---

## Architecture

### Stack (unchanged)

```
packages/shared   – Zod schemas + TypeScript types
packages/db       – Drizzle ORM, migrations, AES-256-GCM encryption
apps/api          – NestJS REST API (port 3001)
apps/web          – React 19 + Vite SPA (port 5173)
api/index.ts      – Vercel serverless entry
```

### Approach: Hybrid — NestJS + Supabase Auth

- NestJS handles all business logic and DB queries via Drizzle (unchanged)
- Supabase Auth handles credential management (email, OAuth, session)
- NestJS validates Supabase JWTs using `SUPABASE_JWT_SECRET`
- Local dev: Docker Compose PostgreSQL; Production: Supabase managed PostgreSQL
- Same `DATABASE_URL` swap is the only config change between environments

---

## Infrastructure

### Docker Compose (`docker-compose.yml` — repo root)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: atlas_lineage
      POSTGRES_USER: atlas
      POSTGRES_PASSWORD: atlas
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

DBeaver connection: `localhost:5432`, db `atlas_lineage`, user `atlas`, password `atlas`.

### Environment Variables

**`apps/api/.env` (local):**
```
DATABASE_URL=postgresql://atlas:atlas@localhost:5432/atlas_lineage
SUPABASE_JWT_SECRET=<from Supabase dashboard → Settings → API>
ENCRYPTION_KEY=<64-char hex>
CORS_ORIGIN=http://localhost:5173

# Cookie config (defaults shown)
COOKIE_ACCESS_TOKEN_NAME=access_token
COOKIE_REFRESH_TOKEN_NAME=refresh_token
COOKIE_MAX_AGE_ACCESS=3600
COOKIE_MAX_AGE_REFRESH=604800
```

**`apps/api/.env` (production / Vercel):**
```
DATABASE_URL=<Supabase Transaction Pooler connection string>
SUPABASE_JWT_SECRET=<same secret>
ENCRYPTION_KEY=<same key>
CORS_ORIGIN=https://atlas-lineage.vercel.app
COOKIE_ACCESS_TOKEN_NAME=access_token
COOKIE_REFRESH_TOKEN_NAME=refresh_token
```

**`apps/web/.env`:**
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_API_URL=http://localhost:3001
```

---

## Data Model

### New Tables

```sql
-- Mirrors Supabase auth.users; stores display info
profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users,
  display_name text,
  avatar_url   text,
  created_at   timestamp DEFAULT now()
)

-- A named family tree
family_trees (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  owner_id   uuid NOT NULL REFERENCES profiles(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)

-- Who has access to which tree
tree_members (
  id       serial PRIMARY KEY,
  tree_id  integer NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
  user_id  uuid    NOT NULL REFERENCES profiles(id),
  role     text    NOT NULL CHECK (role IN ('owner','editor','viewer')),
  joined_at timestamp DEFAULT now(),
  UNIQUE (tree_id, user_id)
)
```

### Modified Tables

```sql
-- persons: add tree_id
ALTER TABLE persons ADD COLUMN tree_id integer NOT NULL REFERENCES family_trees(id);
```

`relationships` — no changes.

### Migration Strategy

1. Add `family_trees` with `owner_id` temporarily nullable, `tree_members`, and `profiles` tables
2. Insert a default "Family" tree (`id = 1`, `owner_id = NULL`)
3. Add `persons.tree_id` as nullable integer with FK to `family_trees`
4. `UPDATE persons SET tree_id = 1` — backfill all existing rows to the default tree
5. `ALTER TABLE persons ALTER COLUMN tree_id SET NOT NULL` — add the constraint after backfill
6. On first user sign-up: a NestJS post-signup hook sets `family_trees.owner_id` to the new user's `profiles.id` and inserts a `tree_members` row with `role = 'owner'`

> **Note:** `family_trees.owner_id` must remain nullable until the first user claims the default tree. Set it NOT NULL only after ownership is confirmed.

### Encryption (unchanged)

`birth_place` and `notes` remain AES-256-GCM encrypted at rest via `packages/db/src/crypto.ts`. Format: `"iv:authTag:ciphertext"` (hex). Null/empty inputs stored as SQL NULL.

---

## Authentication

### Flow

1. **Sign-in** — `supabase.auth.signIn()` on the web app (`persistSession: false`)
2. Web app calls `POST /api/auth/session` with the JWT in the request body
3. NestJS verifies the JWT, then sets two HTTP-only cookies:
   - `$COOKIE_ACCESS_TOKEN_NAME` — signed JWT, `MaxAge = $COOKIE_MAX_AGE_ACCESS`
   - `$COOKIE_REFRESH_TOKEN_NAME` — refresh token, `MaxAge = $COOKIE_MAX_AGE_REFRESH`
   - Both: `HttpOnly; SameSite=Strict; Path=/api`; `Secure` flag set only when `NODE_ENV=production` (localhost is HTTP)
4. All subsequent API calls use `credentials: 'include'` — browser sends cookies automatically
5. **NestJS `SupabaseAuthGuard`** reads `req.cookies[$COOKIE_ACCESS_TOKEN_NAME]`, verifies with `SUPABASE_JWT_SECRET`, sets `req.user.id`
6. **`TreeMemberGuard`** checks `tree_members` for the user's role on the requested tree

### Token Refresh

- On 401 from the API, the web `apiClient` intercepts and calls `POST /api/auth/refresh`
- NestJS reads the refresh cookie, calls `supabase.auth.refreshSession()`, sets a new access cookie
- Original request retries transparently — user never sees a logout
- If refresh token is also expired → redirect to `/login`

### Sign-out

`POST /api/auth/signout` — NestJS clears both cookies (`Max-Age=0`) and revokes the Supabase session.

### CORS

NestJS must be configured with `credentials: true` and the explicit origin (not `*`) for cross-origin cookies to work in local dev.

### Roles

| Role | Permissions |
|------|-------------|
| `owner` | Full access — read, write, delete, manage members |
| `editor` | Read + write persons and relationships |
| `viewer` | Read only |

---

## UI Design

### Theme: Premium Dark — Liquid Glass

| Token | Value |
|-------|-------|
| `--bg-deep` | `#070A14` |
| `--bg-base` | `#0D1117` |
| `--glass-surface` | `rgba(255,255,255,0.04)` + `backdrop-filter: blur(12px)` |
| `--glass-border` | `rgba(255,255,255,0.08)` |
| `--foreground` | `#F8FAFC` |
| `--foreground-muted` | `#8892A4` |
| `--accent-gold` | `#EAB308` |
| `--accent-gold-glow` | `rgba(234,179,8,0.25)` |
| `--accent-blue` | `#3B82F6` |
| `--destructive` | `#EF4444` |
| `--radius` | `14px` cards, `8px` inputs/buttons |
| `--easing` | `cubic-bezier(0.16, 1, 0.3, 1)` |

### Typography

| Usage | Font | Weight |
|-------|------|--------|
| Headings (h1–h3) | Playfair Display | 600–700 |
| Body, UI labels | Inter | 400–600 |
| Code / monospace | inherit system | 400 |

Google Fonts import:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap');
```

### Adaptive Layout

| Breakpoint | Layout |
|------------|--------|
| ≥ 1024px (desktop) | Icon nav rail (44px) + expandable sidebar (220px) + map fills rest |
| < 768px (mobile) | Top header (search + avatar) + full-screen map + bottom tab bar (4 tabs) |

**Desktop nav rail icons:** Map · Tree · Timeline · (spacer) · Profile  
**Mobile bottom tabs:** Map · Tree · Timeline · People

### Components

**Buttons:**
- Primary: `linear-gradient(135deg, #EAB308, #CA8A04)`, black text, gold `box-shadow` glow
- Secondary: glass surface, white text
- Ghost: transparent, gold text
- Destructive: `rgba(239,68,68,0.12)` bg, red border + text

**Badges (pill shape, `border-radius: 20px`):**

| Type | Background | Text |
|------|-----------|------|
| Parent | `rgba(59,130,246,0.12)` | `#93C5FD` |
| Child | `rgba(34,197,94,0.12)` | `#86EFAC` |
| Sibling | `rgba(168,85,247,0.12)` | `#D8B4FE` |
| Spouse | `rgba(234,179,8,0.12)` | `#FDE68A` |
| Partner | `rgba(20,184,166,0.12)` | `#99F6E4` |
| Owner | `rgba(234,179,8,0.12)`, gold border | `#EAB308` |
| Editor | glass | `#93C5FD` |
| Viewer | glass muted | `#475569` |

**Map markers:**
- Default: `#EAB308` fill, `box-shadow: 0 0 10px 3px rgba(234,179,8,0.45)`
- Selected: larger (20px), stronger glow, white ring border
- No coordinates: muted grey `#334155`, low opacity
- Relationship lines: gold dashed (`stroke-dasharray: 5,3`, opacity 0.5)
- Direct ancestor: gold solid, full opacity

**Person card:** glass surface, Playfair Display name, pill badges, ambient gold blob in corner.

**Ambient background:** 2–3 absolute radial gradient blobs (`rgba(234,179,8,0.06)` and `rgba(59,130,246,0.07)`) behind main surfaces for depth.

---

## API Changes (Phase 1 additions)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/session` | Set HTTP-only cookies from Supabase JWT |
| POST | `/api/auth/refresh` | Refresh access token using refresh cookie |
| POST | `/api/auth/signout` | Clear cookies + revoke Supabase session |
| GET | `/api/trees` | List trees the current user is a member of |
| POST | `/api/trees` | Create a new family tree |
| GET | `/api/trees/:id/members` | List members of a tree |
| POST | `/api/trees/:id/members` | Add a member (owner only) |
| PATCH | `/api/trees/:id/members/:userId` | Change a member's role (owner only) |
| DELETE | `/api/trees/:id/members/:userId` | Remove a member (owner only) |

Existing `/api/persons` and `/api/relationships` endpoints gain `tree_id` scoping — all queries filter by the authenticated user's tree.

---

## Testing

- Existing Jest + Vitest test suites remain; new guards and services follow existing `.spec.ts` patterns
- `SupabaseAuthGuard` and `TreeMemberGuard` unit-tested with mocked JWT payloads
- E2E tests (Playwright) updated to use `DATABASE_URL` (PostgreSQL) — remove legacy `DATABASE_PATH`
- Docker Compose used as the test database in local E2E runs

---

## Phase Roadmap

| Phase | Features |
|-------|---------|
| **1 — Foundation** (this spec) | Docker, Supabase, Auth, Roles, Dark UI, Map redesign, Search |
| **2 — Visualization** | Family Tree view, Timeline view |
| **3 — Profiles** | Photo upload, rich person events (birth/marriage/migration) |
| **4 — Sharing** | Invite by email, read-only share links, GEDCOM import/export |
