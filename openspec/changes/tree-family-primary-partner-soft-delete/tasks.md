## 1. Schema & Migration

- [ ] 1.1 Add `profiles.primary_tree_id` (nullable integer, FK → `family_trees.id`, `ON DELETE SET NULL`) to `packages/db/src/schema.ts`
- [ ] 1.2 Add `family_trees.deleted_at` (nullable timestamp) to `packages/db/src/schema.ts`
- [ ] 1.3 Run `pnpm db:generate` to produce the migration, then `pnpm db:migrate` against local Postgres
- [ ] 1.4 Update `packages/shared` types/Zod schemas: `FamilyTree.deletedAt`, `UserProfile.primaryTreeId`, and the `PATCH /api/auth/profile` input schema to accept `primaryTreeId?: number | null`

## 2. `packages/db` Query Layer

- [ ] 2.1 In `packages/db/src/queries/trees.ts`, filter `findTreesByUser`, `findTreeById`, `findMemberRole` (and any other tree read) by `isNull(familyTrees.deletedAt)`
- [ ] 2.2 Add `softDeleteTree(treeId, callerId)`: sets `deleted_at = now()` on the tree (owner-checked at the service layer), and in the same transaction runs `UPDATE profiles SET primary_tree_id = NULL WHERE primary_tree_id = :treeId`
- [ ] 2.3 Add `restoreTree(treeId, callerId)`: clears `deleted_at` where the tree is currently soft-deleted and owned by `callerId`; returns `null` if no matching row
- [ ] 2.4 Add `purgeTree(treeId, callerId)`: hard-deletes the `family_trees` row (cascades via existing FKs) where currently soft-deleted and owned by `callerId`; returns `null`/false if no matching row
- [ ] 2.5 Add `findTrashedTreesByOwner(ownerId)`: returns trees with non-null `deleted_at` where `owner_id = ownerId`
- [ ] 2.6 Remove `claimDefaultTree`; add `createPersonalTreeIfNeeded(userId)` that checks for zero `tree_members` rows, and if so calls the existing tree-creation path plus sets `primary_tree_id`
- [ ] 2.7 Add `setPrimaryTree(userId, treeId | null)`: validates `treeId` is null or a tree the user has a (non-deleted) `tree_members` row for, then updates `profiles.primary_tree_id`
- [ ] 2.8 Update `getProfile`/`mapProfile` to include `primaryTreeId`

## 3. `apps/api`

- [ ] 3.1 `AuthService`: replace `claimDefaultTree(...)` calls (password + OAuth sign-in) with `createPersonalTreeIfNeeded(...)`
- [ ] 3.2 `AuthController` / `UpdateProfileSettingsDto`: accept optional `primaryTreeId` in `PATCH /api/auth/profile`, call `setPrimaryTree`; return 404 (via `NotFoundException`) if the tree isn't a valid membership
- [ ] 3.3 Confirm `GET /api/auth/me` response includes `primaryTreeId` (falls out of `getProfile`/`AuthService.getUser` once 2.8 lands — verify and adjust the response shape if it's assembled separately)
- [ ] 3.4 `TreesController`: add `DELETE /trees/:treeId` (`@UseGuards(TreeMemberGuard)`, `@RequireRoles('owner')`) calling `softDeleteTree`
- [ ] 3.5 `TreesController`: add `POST /trees/:treeId/restore` and `DELETE /trees/:treeId/purge` — these must NOT use `TreeMemberGuard` (it excludes deleted trees); add an owner-only check in `TreesService` that looks up the tree including soft-deleted ones and verifies `ownerId === req.user.id`
- [ ] 3.6 `TreesController`: add `GET /trees/trash` returning `findTrashedTreesByOwner(req.user.id)`
- [ ] 3.7 Verify existing `TreeMemberGuard`/`getMemberRole` 404s correctly for a soft-deleted tree across persons, relationships, tree-update, and add-member routes (should require no guard code changes once 2.1 lands — write tests to confirm, see section 6)

## 4. `apps/web` — Primary Tree

- [ ] 4.1 `TreeContext.tsx`: change the initial-selection effect to prefer `primaryTreeId` (from `useAuth`/`AuthContext`) over `localStorage['currentTreeId']`; keep `localStorage` write-on-switch for mid-session changes via `TreeSwitcher`
- [ ] 4.2 `AuthContext`/`api/client.ts`: ensure the `/api/auth/me` response type includes `primaryTreeId` and it's threaded through to `TreeContext`
- [ ] 4.3 `SettingsDialog`: add a "Set as primary tree" control (e.g. a button/toggle next to the tree switcher or in settings) calling `PATCH /api/auth/profile` with `primaryTreeId`
- [ ] 4.4 `api/client.ts`: extend `api.auth.updateProfile` (or equivalent) to accept `primaryTreeId`

## 5. `apps/web` — Soft Delete & Trash UI

- [ ] 5.1 `api/client.ts`: add `api.trees.delete`, `api.trees.restore`, `api.trees.purge`, `api.trees.trash`
- [ ] 5.2 `TreeSwitcher.tsx` (or a new dialog): add a "Delete tree" action (owner-only, gated on `currentTree.role === 'owner'`) behind the existing `ConfirmDialog`
- [ ] 5.3 Add a Trash view/section (new component, e.g. `TrashDialog.tsx`) listing soft-deleted trees for the current user with Restore and Permanently Delete actions; permanent delete goes through `ConfirmDialog` with copy that makes irreversibility explicit
- [ ] 5.4 Invalidate the `['trees', ...]` TanStack Query cache (and `currentTreeId` fallback selection) after delete/restore/purge
- [ ] 5.5 Handle the case where the deleted tree was the active `currentTree`: fall back to another tree in the list (or an empty state if none remain)
- [ ] 5.6 i18n: add English + Thai strings for delete/restore/purge/trash UI copy (`apps/web/src/i18n/locales/`)

## 6. `apps/web` — Partner Merge View

- [ ] 6.1 `familyTreeLayout.ts`: when selecting each pair from `partnerPairs`, keep only the pair formed by a person's lowest-id partner relationship; track it separately from any additional partner relationships for that person
- [ ] 6.2 Compute merged-pair geometry: both partners share one x-slot sized for a combined card; expose this via the existing `partnerLinks` shape or a new field (e.g. `mergedPairs`) — pick whichever keeps `nodes` a clean 1:1 `Person` → `PersonNode` map (see design.md)
- [ ] 6.3 Ensure `parentGroupLinks`' child-line origin uses the merged pair's shared center x, not either individual partner's x
- [ ] 6.4 Any additional (non-first) partner relationship for a person renders via the pre-existing two-card-plus-connector path — do not regress that rendering
- [ ] 6.5 `FamilyChart.tsx`: render one wide card/group for a merged pair (names, avatars for both) instead of two `PersonCard`-equivalent SVG nodes; adjust card width/spacing constants as needed
- [ ] 6.6 Verify `PersonCard`'s `INVERSE_TYPE` badge logic (used elsewhere, e.g. person detail view) is unaffected — merge is chart-rendering-only, not a data model change

## 7. Tests

- [ ] 7.1 `packages/db`: unit tests for `softDeleteTree`/`restoreTree`/`purgeTree`/`findTrashedTreesByOwner`/`createPersonalTreeIfNeeded`/`setPrimaryTree` (`trees.spec.ts`)
- [ ] 7.2 `apps/api`: controller/service tests for the new tree routes (delete/restore/purge/trash), including role checks (403 for non-owner) and 404s for deleted/nonexistent/foreign trees
- [ ] 7.3 `apps/api`: test that `TreeMemberGuard`-protected routes (persons, relationships) 404 once their tree is soft-deleted, for every role including the former owner
- [ ] 7.4 `apps/api`: test `AuthService` creates a personal tree + sets `primaryTreeId` only on zero-membership sign-in, and is a no-op otherwise
- [ ] 7.5 `apps/web`: `familyTreeLayout.test.ts` cases for merged-card geometry (single partner merges, second partner falls back, children link to merged center)
- [ ] 7.6 `apps/web`: `TreeContext.test.tsx` cases for primary-first initial selection vs. `localStorage` fallback
- [ ] 7.7 `apps/web`: component tests for Trash UI (list, restore, purge-with-confirm) and Settings "set primary" control
- [ ] 7.8 Capture before/after `FamilyChart` screenshots (merged partner cards) per this repo's UI-change convention, and clean up any throwaway script afterward

## 8. Spec Housekeeping

- [ ] 8.1 After implementation, run `openspec validate --all` (via `npx @fission-ai/openspec@1.7.0`) and archive the change per the repo's OpenSpec workflow
- [ ] 8.2 Update `openspec/capabilities.yaml`: bump `family-tree-management`'s `requirements` count and refresh its `notes` to describe primary-tree selection, soft delete/trash, and the merged partner card
