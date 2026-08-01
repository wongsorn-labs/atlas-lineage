## Context

See proposal.md - Why. Relevant existing state:

- `TreesController` (`apps/api/src/trees/trees.controller.ts`) has no DTO classes — `POST /trees` and `POST /trees/:treeId/members` type `@Body()` directly as the shared `CreateTreeInput`/`AddTreeMemberInput` interfaces. The global `ValidationPipe` (`whitelist: true, transform: true`) only validates `class-validator`-decorated classes, so today neither existing tree route gets any server-side body validation — the `packages/shared` Zod schemas are only wired into the web forms (`zodResolver`).
- `family_trees.updated_at` has `.defaultNow()` but no `.$onUpdate()`, so nothing currently bumps it on a Drizzle `.update()`.
- `TreeMemberGuard` + `@RequireRoles(...)` already implements the `owner > editor > viewer` hierarchy and is applied to the members endpoint at `owner` level; there's no precedent yet for an `editor`-level write route on `TreesController`.

## Goals / Non-Goals

**Goals:**
- Add the update path with the same validation rigor the `persons`/`relationships` modules already have (class-validator DTO + `ValidationPipe`), rather than perpetuating the trees module's current no-validation gap for a brand new route.
- Keep the change additive to `packages/db`/`packages/shared` — no schema migration.

**Non-Goals:**
- Retrofitting validation onto the existing `POST /trees` and `POST /trees/:treeId/members` routes. Out of scope for this change; worth a follow-up but not required to add one more properly-validated route.
- Adding `$onUpdate()` to the `family_trees.updated_at` column at the schema level. `updateTree` will set `updatedAt: new Date()` explicitly in its `.set()` call, matching how the query layer already handles per-field updates elsewhere (`updatePerson`) rather than introducing a schema-wide behavior change.
- Deleting/archiving a tree, transferring ownership, or removing members — all separate, larger pieces of `family-tree-management` left for future proposals.

## Decisions

**Role required: `owner`, not `editor`.** Renaming or redescribing a tree changes something every member sees, not per-record data. This matches the existing precedent (`POST /trees/:treeId/members` already requires `owner`) and keeps the "structural/administrative tree action" bar consistent. Alternative considered: `editor` (consistent with editor-level write access to persons/relationships) — rejected because tree identity feels closer to membership management than to person/relationship data.

**Add a class-validator DTO for this route** (`apps/api/src/trees/dto/update-tree.dto.ts`), following the `persons`/`relationships`/`auth` module convention (`class-validator` decorators + the global `ValidationPipe`), rather than typing `@Body()` as the bare `UpdateTreeInput` interface the way the two existing tree routes do. Alternative considered: match the existing (unvalidated) tree-route style for consistency within the module — rejected because it would ship a new endpoint with no input validation at all (an empty-string name would silently blank a tree's name), and the 2026-07-05 OAuth session change already set precedent for preferring the repo-wide DTO convention over a module's own inconsistent precedent when adding a new route.

**Partial update semantics**: both `name` and `description` are optional in the request body; only fields present are written, mirroring `updatePerson`'s `if (input.field !== undefined)` pattern rather than requiring the full object (which would force clients to resend an unchanged `description` just to rename a tree).

## Risks / Trade-offs

- [Adding validation only to the new route leaves `POST /trees`/`POST /trees/:treeId/members` inconsistent within the same controller] → Acceptable short-term; flagged here so a future cleanup proposal can retrofit DTOs onto the older routes without rediscovering the gap.
- [`owner`-only gating means a tree with no owner (e.g., between creation and the default-tree auto-claim edge case) can never have its details edited] → Matches existing behavior for `POST /trees/:treeId/members`, which has the same constraint; not a new risk introduced by this change.
