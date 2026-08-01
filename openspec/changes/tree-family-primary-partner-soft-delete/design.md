## Context

`packages/db/src/queries/trees.ts` currently has no delete path at all, and `claimDefaultTree` hardcodes tree id 1 as a single shared default. `TreeMemberGuard` (`apps/api/src/trees/tree-member.guard.ts`) resolves membership via `TreesService.getMemberRole`, throwing `NotFoundException` when no role is found — soft-delete reuses this exact 404 path by making a deleted tree simply not resolve a role. `apps/web/src/contexts/TreeContext.tsx` currently picks the initial tree from `localStorage['currentTreeId']`, falling back to `trees[0]`. `apps/web/src/lib/familyTreeLayout.ts` already computes `partnerPairs` and pulls them to adjacent x-positions in the same row (`partnerLinks`); it does not currently collapse them into one node. See proposal.md for motivation on all three.

## Goals / Non-Goals

**Goals:**
- Soft delete that never touches existing cascading FKs on `persons`/`relationships`/`tree_members` — only `family_trees.deleted_at` gates visibility.
- Reuse `TreeMemberGuard`'s existing "no role found → 404" behavior for soft-deleted trees rather than adding a parallel check.
- Keep the merged-partner-card change confined to `familyTreeLayout.ts`'s geometry output and `FamilyChart.tsx`'s rendering — no change to how relationships are stored or validated.

**Non-Goals:**
- No scheduled/cron purge job (manual purge only, per proposal).
- No UI for reassigning a new primary tree automatically after deletion — user re-picks.
- No change to `sibling` relationship rendering or to the Map view's relationship line coloring.
- No support for merging 3+ people into one card (only the first partner pair merges; see proposal).

## Decisions

**Soft delete via `deleted_at`, not a boolean `is_deleted`.** A timestamp records *when* without a second column, and is the pattern most readers will already expect (`created_at`/`updated_at` are timestamps throughout this schema).

**`TreeMemberGuard` treats a soft-deleted tree as "no membership."** `TreesService.getMemberRole` adds `isNull(familyTrees.deletedAt)` to its join/where clause. Every route already behind `TreeMemberGuard` (persons, relationships, tree update, add-member) then 404s for a soft-deleted tree automatically, with no new guard logic. Trash/restore/purge routes intentionally do **not** use `TreeMemberGuard` as-is — they need a variant (or a dedicated owner-role check in `TreesService`) that looks *for* `deleted_at IS NOT NULL` rather than excluding it. Kept as a small separate lookup (`findTreeById` including deleted, checked against `ownerId`) rather than parameterizing `TreeMemberGuard`, since only three routes need it and the semantics (must find a *deleted* tree you own) are the inverse of every other guarded route.

**`DELETE /api/trees/:treeId` vs `/purge`.** Two distinct routes rather than a `?hard=true` query flag, so the destructive action has its own URL to reason about in logs/audit and can't be triggered by a typo'd query param on the soft-delete call.

**Primary-tree clear is a bulk `UPDATE profiles SET primary_tree_id = NULL WHERE primary_tree_id = :treeId`, run inside the same delete.** Soft-deleting a tree can orphan *any* member's `primary_tree_id`, not just the deleter's own — an editor or viewer could have set that tree primary before the owner deleted it. Doing this as one extra `UPDATE` alongside the `deleted_at` write (same transaction) avoids a background job or a lazy-fix-on-read approach.

**Personal-tree-on-first-sign-in reuses `createTree`, called from `AuthService` in place of `claimDefaultTree`.** Same insert pattern as the existing `POST /api/trees` path (`family_trees` row + owner `tree_members` row), so no new tree-creation code path is introduced — only the trigger changes (zero-membership check instead of id-1-ownerless check) and it additionally sets `primary_tree_id`.

**`TreeContext` primary-first load: fetch order stays the same, selection logic changes.** `GET /api/auth/me` already round-trips on every session start (existing `AuthContext`); its response gains `primaryTreeId`. `TreeContext`'s effect that currently reads `localStorage` first tries `primaryTreeId` from the auth context first, `localStorage` second, `trees[0]` last. `TreeSwitcher`'s `setCurrentTreeId` still writes to `localStorage` for the *current session's* mid-session switches, but that stored value is no longer consulted as the *initial* pick on a fresh sign-in.

**Merged partner card is a rendering-layer concept, not a new node type.** `computeFamilyTreeLayout` keeps emitting one `PersonNode` per `Person` (so `nodes` stays a 1:1 map other code can rely on), but adds a `mergedPartnerOf: Map<personId, personId>` (or equivalent) marking the *second* person of a merged pair, and computes both persons' `x` to the same slot so their combined card spans what would have been two columns. `FamilyChart.tsx` looks up this map to render one wide `<g>` per merged pair instead of two. `parentGroupLinks`' existing barycenter/child-line math already operates on `PersonNode.x`; feeding it the merged pair's shared center requires no structural change there, only that both partners resolve to the same x.

**"First recorded partner relationship" = lowest relationship `id`.** Relationship rows are `serial` primary keys inserted in creation order, so "first recorded" is unambiguous and requires no new ordering column.

## Risks / Trade-offs

- **[Bulk primary-tree clear touches rows outside the deleting owner's control]** → Acceptable per proposal decision (no auto-reassignment); documented in the spec so it's an intentional, visible behavior rather than a surprise.
- **[Two lookup paths for tree membership — normal (excludes deleted) and trash (requires deleted)]** → Small, well-isolated duplication (one extra query function in `packages/db/src/queries/trees.ts`) versus parameterizing the shared guard; kept simple deliberately.
- **[Retiring `claimDefaultTree` is a breaking behavior change for the existing seed tree (id 1)]** → No data migration needed (see spec's Migration note) — tree id 1 keeps whatever members it already has; only *new* zero-membership sign-ins take the new path.
- **[Merged card width affects existing `COL_STEP`/`CARD_WIDTH` layout constants]** → Confined to `familyTreeLayout.ts` and `FamilyChart.tsx`; `familyTreeLayout.test.ts` already covers partner-adjacency behavior and will need new cases for the merged-card geometry, catching regressions before they reach rendering.

## Migration Plan

1. Drizzle migration: add `profiles.primary_tree_id` (nullable FK → `family_trees.id`, `ON DELETE SET NULL`) and `family_trees.deleted_at` (nullable timestamp). Additive, non-breaking; run `pnpm db:generate` then `pnpm db:migrate`.
2. Ship API changes (new routes, guard query change, `AuthService` trigger swap) and web changes together — `claimDefaultTree`'s removal and the new sign-in flow must land in the same deploy as the DB migration, since the old code path assumes tree id 1 always exists as the target.
3. No backfill needed: existing users already have `tree_members` rows (so the zero-membership check never fires for them), and `primary_tree_id`/`deleted_at` both default to `NULL`, which is a safe "unset" state for every existing row.
4. Rollback: dropping the two new columns is safe (nothing else depends on them yet) if the migration needs to be reverted; no destructive data changes are made to existing `family_trees`/`persons`/`relationships` rows by this change.
