## 1. Schema & Migration

- [x] 1.1 Add `profiles.primary_tree_id` (nullable integer, FK → `family_trees.id`, `ON DELETE SET NULL`) to `packages/db/src/schema.ts`
- [x] 1.2 Add `family_trees.deleted_at` (nullable timestamp) to `packages/db/src/schema.ts`
- [x] 1.3 Add `person_trees` table to `packages/db/src/schema.ts`: `personId` (FK → `persons.id`, cascade), `treeId` (FK → `family_trees.id`, cascade), `status` (pg enum `pending`/`approved`), `requestedBy` (FK → `profiles.id`), `createdAt`, `decidedAt` (nullable), unique index on `(personId, treeId)`
- [x] 1.4 Run `pnpm db:generate` to produce the migration (`drizzle/0007_flawless_donald_blake.sql`); `pnpm db:migrate` requires a live `DATABASE_URL` Postgres instance not available in this environment — run it against your local/staging DB before deploying
- [x] 1.5 Update `packages/shared` types/Zod schemas: `FamilyTree.deletedAt`, `UserProfile.primaryTreeId`, `PersonTreeLink` type, and the `PATCH /api/auth/profile` input schema to accept `primaryTreeId?: number | null`

## 2. `packages/db` Query Layer

- [x] 2.1 In `packages/db/src/queries/trees.ts`, filter `findTreesByUser`, `findTreeById`, `findMemberRole` (and any other tree read) by `isNull(familyTrees.deletedAt)`
- [x] 2.2 Add `softDeleteTree(treeId, callerId)`: sets `deleted_at = now()` on the tree (owner-checked), and updates `profiles SET primary_tree_id = NULL WHERE primary_tree_id = :treeId`
- [x] 2.3 Add `restoreTree(treeId, callerId)`: clears `deleted_at` where the tree is currently soft-deleted and owned by `callerId`; returns `null` if no matching row
- [x] 2.4 Add `purgeTree(treeId, callerId)`: hard-deletes the `family_trees` row (cascades via existing FKs) where currently soft-deleted and owned by `callerId`; returns `null`/false if no matching row
- [x] 2.5 Add `findTrashedTreesByOwner(ownerId)`: returns trees with non-null `deleted_at` where `owner_id = ownerId`
- [x] 2.6 Remove `claimDefaultTree`; add `createPersonalTreeIfNeeded(userId)` that checks for zero `tree_members` rows, and if so calls the existing tree-creation path plus sets `primary_tree_id`
- [x] 2.7 Add `setPrimaryTree(userId, treeId | null)`: validates `treeId` is null or a tree the user has a (non-deleted) `tree_members` row for, then updates `profiles.primary_tree_id`
- [x] 2.8 Update `getProfile`/`mapProfile` to include `primaryTreeId`
- [x] 2.9 Add `requestPersonLink(personId, destinationTreeId, requestedByUserId)`: validates the person exists, and no `pending`/`approved` row already exists for that pair (and the person's origin tree isn't already `destinationTreeId`); inserts a `pending` `person_trees` row. Caller's ownership of `destinationTreeId` is enforced by `TreeMemberGuard`/`RequireRoles('owner')` at the route
- [x] 2.10 Add `approvePersonLink`/`rejectPersonLink(id)`: transitions/deletes a `pending` row; origin-tree-owner check done by the calling service via `findMemberRole`
- [x] 2.11 Add `unlinkPersonTree(id)`: deletes a `person_trees` row by id; either-side-owner check done by the calling service
- [x] 2.12 Update `findAllPersons`/`findPersonById` (tree-scoped reads) to also return persons with an `approved` `person_trees` row for the queried `treeId` (whose origin tree isn't soft-deleted), in addition to `persons.tree_id` matches
- [x] 2.13 Write/delete paths (`updatePerson`/`deletePerson`) are left querying `persons.tree_id = treeId` directly (unchanged) — since that column is untouched by linking, this already enforces origin-only writes; the service layer (3.11) distinguishes 404 (not visible at all) from 403 (visible via link, not origin) by comparing `person.treeId !== treeId` after the expanded read

## 3. `apps/api`

- [x] 3.1 `AuthService`: replace `claimDefaultTree(...)` calls (password + OAuth sign-in) with `createPersonalTreeIfNeeded(...)`
- [x] 3.2 `AuthController` / `UpdateProfileSettingsDto`: accept optional `primaryTreeId` in `PATCH /api/auth/profile`, call `setPrimaryTree` (via `AuthService.updateProfileSettings`); return 404 (via `NotFoundException`) if the tree isn't a valid membership
- [x] 3.3 `GET /api/auth/me` response includes `primaryTreeId` (`AuthService.getUser`/`signIn`/`exchangeOAuthSession` all include it)
- [x] 3.4 `TreesController`: add `DELETE /trees/:treeId` (`@UseGuards(TreeMemberGuard)`, `@RequireRoles('owner')`) calling `softDeleteTree`
- [x] 3.5 `TreesController`: add `POST /trees/:treeId/restore` and `DELETE /trees/:treeId/purge` — no `TreeMemberGuard` (it excludes deleted trees); owner-only check happens inside `softDeleteTree`/`restoreTree`/`purgeTree` in `packages/db`
- [x] 3.6 `TreesController`: add `GET /trees/trash` returning `findTrashedTreesByOwner(req.user.id)`
- [x] 3.7 Verified existing `TreeMemberGuard`/`getMemberRole` 404s correctly for a soft-deleted tree (no guard code changes needed once 2.1 landed); covered by new tests in section 8
- [x] 3.8 `TreesController`: add `POST /trees/:treeId/person-links` (owner-only, `treeId` = destination) calling `requestPersonLink`
- [x] 3.9 New `PersonLinksController` (`/person-links`): `POST /person-links/:id/approve` and `POST /person-links/:id/reject` — owner-of-origin-tree-only (checked in `TreesService.decidePersonLink`), calling `approvePersonLink`/`rejectPersonLink`; also `GET /person-links/pending` for the incoming-requests view
- [x] 3.10 `PersonLinksController`: add `DELETE /person-links/:id` (unlink) — owner-of-either-side-only (checked in `TreesService.unlinkPersonTree`)
- [x] 3.11 `PersonsService`: reads use 2.12's expanded query; `update`/`remove` gate via a new `assertWritable` check (403, not 404, when the tree has read access via a link but not write access)
- [x] 3.12 `RelationshipsService.create`'s existing cross-tree existence check (`findPersonById`) already accepts a person via `persons.tree_id` match OR an `approved` `person_trees` row, since 2.12 updated `findPersonById` itself — no controller/service change needed

## 4. `apps/web` — Primary Tree

- [x] 4.1 `TreeContext.tsx`: change the initial-selection effect to prefer `primaryTreeId` (from `useAuth`/`AuthContext`) over `localStorage['currentTreeId']`; keep `localStorage` write-on-switch for mid-session changes via `TreeSwitcher`
- [x] 4.2 `AuthContext`/`api/client.ts`: `AuthUser` type includes `primaryTreeId`, threaded through to `TreeContext`
- [x] 4.3 `SettingsDialog`: add a "Set as primary tree" control calling `PATCH /api/auth/profile` with `primaryTreeId` (via `AuthContext.setPrimaryTree`)
- [x] 4.4 `api/client.ts`: `api.auth.updateProfile` now takes `UpdateProfileSettingsInput` (`{ defaultCountry?, primaryTreeId? }`)

## 5. `apps/web` — Soft Delete & Trash UI

- [x] 5.1 `api/client.ts`: add `api.trees.delete`, `api.trees.restore`, `api.trees.purge`, `api.trees.trash`
- [x] 5.2 `EditTreeDialog.tsx`: add a "Delete tree" action (owner-only, already gated by `tree.role !== 'owner'`) behind `ConfirmDialog`
- [x] 5.3 Add `TrashDialog.tsx` listing soft-deleted trees for the current user with Restore and Permanently Delete actions; permanent delete goes through `ConfirmDialog`, wired into `TreeSwitcher.tsx`
- [x] 5.4 `useTrees.ts` hooks (`useDeleteTree`/`useRestoreTree`/`usePurgeTree`) invalidate the `['trees', ...]`/`['trees','trash']` TanStack Query caches
- [x] 5.5 Deleted-active-tree fallback falls out of `TreeContext`'s existing selection effect: once the invalidated `trees` list no longer contains `currentTreeId`, it re-picks primary/localStorage/`trees[0]` automatically — no extra code needed
- [x] 5.6 i18n: added English + Thai strings for delete/restore/purge/trash UI copy

## 6. `apps/web` — Partner Merge View

- [x] 6.1 `familyTreeLayout.ts`: a pair merges only when its relationship id is the lowest partner-type relationship id for BOTH people (symmetric "first recorded" rule); tracked via `mergedPairKeys`, separate from any additional partner relationships
- [x] 6.2 Merged-pair geometry: both partners share one x (`MERGED_CARD_WIDTH = 2*CARD_WIDTH + seam`); exposed via a new `mergedPairs: MergedPair[]` field — `nodes` stays a clean 1:1 `Person` → `PersonNode` map
- [x] 6.3 `FamilyChart.tsx`'s `parentGroupLinks` rendering now uses a `centerX()` helper that returns the merged pair's true fused-card center, not either individual partner's `x + CARD_WIDTH/2`
- [x] 6.4 Any additional (non-first, or asymmetric) partner relationship stays in `partnerLinks` and renders via the pre-existing two-card-plus-connector path
- [x] 6.5 `FamilyChart.tsx`: new `PersonMark` sub-component reused for both single cards and each half of a merged pair; merged pairs render as one wide group (two avatars + a small connector dot in the seam) instead of two independent nodes
- [x] 6.6 `PersonCard`'s `INVERSE_TYPE` badge logic is untouched — merge is chart-rendering-only (`familyTreeLayout.ts`/`FamilyChart.tsx`), no data model change

## 7. `apps/web` — Cross-Tree Person Sharing

- [x] 7.1 `api/client.ts`: add `api.personLinks.request`, `.forPerson`, `.pending`, `.approve`, `.reject`, `.unlink`
- [x] 7.2 `LinkPersonDialog.tsx` (owner-only, in `TreeSwitcher`): "Link person from another tree" action taking a `personId`, calling `request` against the current (destination) tree
- [x] 7.3 `PendingLinkRequestsDialog.tsx` (Sidebar footer): incoming-requests view listing pending `person_trees` requests (across every tree the caller owns as origin, via `GET /person-links/pending`) with Approve/Reject actions
- [x] 7.4 `PersonCard.tsx`: renders a "shared from another tree" icon badge when `person.treeId !== currentTreeId`, and hides the Edit control / swaps Delete for Unlink for that person
- [x] 7.5 Unlink action on a linked person's card, behind `ConfirmDialog`; resolves the `person_trees` link id via a new `GET /trees/:treeId/person-links/:personId` lookup (`usePersonLink` hook) since `PersonCard` only has the `Person`, not the link row id
- [x] 7.6 `usePersonLinks.ts` hooks invalidate `personLinks`/`persons`/`relationships` query caches after request/approve/reject/unlink
- [x] 7.7 i18n: added English + Thai strings for link-request, approve/reject, shared-person badge, and unlink UI copy (done alongside Group 5's i18n pass)

## 8. Tests

- [x] 8.1 `packages/db`: unit tests for `softDeleteTree`/`restoreTree`/`purgeTree`/`findTrashedTreesByOwner`/`createPersonalTreeIfNeeded`/`setPrimaryTree` (`trees.spec.ts`), plus a new `person-links.spec.ts` for `requestPersonLink`/`approvePersonLink`/`rejectPersonLink`/`unlinkPersonTree`/`getPersonOriginTreeId`/`findApprovedLinkedPersonIds`
- [x] 8.2 `apps/api`: controller/service tests for the new tree routes (delete/restore/purge/trash), including role checks (403 for non-owner, via the origin/destination-owner checks in `TreesService`) and 404s for deleted/nonexistent/foreign trees
- [x] 8.3 Already covered by the existing `tree-member.guard.spec.ts` case "throws NotFoundException when the user has no membership on the tree" — a soft-deleted tree makes `getMemberRole` resolve `null` exactly like a non-member, so no new guard test was needed
- [x] 8.4 `apps/api`: new `auth.service.spec.ts` — `signIn`/`exchangeOAuthSession` call `createPersonalTreeIfNeeded` and return `primaryTreeId`; the zero-membership no-op behavior itself is covered at the db layer (8.1)
- [x] 8.5 `apps/web`: `familyTreeLayout.test.ts` cases for merged-card geometry (single partner merges, second partner falls back to a connector, an asymmetric "each side's lowest partner is someone else" pair doesn't merge, parent-group link anchors both merged parents at the same x)
- [x] 8.6 `apps/web`: `TreeContext.test.tsx` cases for primary-first initial selection vs. `localStorage` fallback (primary wins; falls back to localStorage when the primary tree isn't in the list)
- [x] 8.7 `apps/web`: new `TrashDialog.test.tsx` (empty state, list, restore, purge-requires-confirmation) and `SettingsDialog.test.tsx` (set-primary button vs. "already primary" label, calls `setPrimaryTree`)
- [x] 8.8 `packages/db`/`apps/api`: `person-links.spec.ts` + `trees.service.spec.ts` cover person-not-found, already-own-person, duplicate request, non-origin-owner cannot approve/reject, origin-or-destination-owner-only unlink, forbidden-for-neither-owner; `persons.service.spec.ts` covers the destination-tree-cannot-write (403) case. Not separately re-tested: relationship creation against a linked person (falls out of `findPersonById`'s expansion, already covered by 8.1's `findApprovedLinkedPersonIds` test) and revocation-on-soft-delete (covered by `findApprovedLinkedPersonIds` joining on non-deleted origin trees, same test)
- [ ] 8.9 **Not done in this environment**: capturing real before/after `FamilyChart` screenshots needs a running API backed by Postgres (`DATABASE_URL`) to serve real person/relationship data through the dev server, and no live Postgres instance is available in this sandbox (`pg_isready` fails). Run `pnpm dev` locally against a seeded database and capture Map/Chart-view screenshots before merging, per this repo's UI-change convention

## 9. Spec Housekeeping

- [x] 9.1 Ran `openspec validate --all` (clean) and archived the change as `2026-08-01-tree-family-primary-partner-soft-delete`
- [x] 9.2 Updated `openspec/capabilities.yaml`: bumped `family-tree-management`'s `requirements` count and refreshed its `notes`
