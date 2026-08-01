## Why

`family-tree-management` supports creating a family tree (`POST /api/trees`) and listing the ones a user belongs to (`GET /api/trees`), but there is no way to change a tree's `name` or `description` after creation. A user who mistypes a tree name at creation time, or whose tree's purpose evolves, has no path to fix it short of deleting and recreating the tree (which isn't supported either, and would orphan its persons/relationships). This proposal adds an update path for tree details, scoped by the same role hierarchy the rest of the capability already enforces.

## What Changes

- Add `PATCH /api/trees/:treeId` to `apps/api`'s `TreesController`, guarded by `TreeMemberGuard` + `@RequireRoles('owner')` (renaming/redescribing a tree is an ownership-level action, consistent with `POST /trees/:treeId/members` already requiring `owner`).
- Add an `updateTree(treeId, input)` query function to `packages/db/src/queries/trees.ts`, following the partial-update pattern used by `updatePerson` (only set fields present in the input), returning `null` if the tree doesn't exist.
- Add `updateTreeSchema` (Zod) and `UpdateTreeInput` (type) to `packages/shared`, mirroring `createTreeSchema`/`CreateTreeInput`.
- Add web UI: an "Edit tree" entry point in `TreeSwitcher` next to the existing `CreateTreeDialog`/`InviteMemberDialog`, opening a dialog pre-filled with the current tree's name/description that PATCHes on submit and is only shown to the tree's owner (mirroring `InviteMemberDialog`'s owner-only gating).
- Add an `api.trees.update` client method and a `useUpdateTree` hook, and new i18n keys for the edit dialog (`en`/`th`).

## Capabilities

### Modified Capabilities
- `family-tree-management`: adds a requirement for updating an existing family tree's name/description, enforced at the `owner` role.

## Impact

- Affected code: `apps/api/src/trees/{trees.controller.ts,trees.service.ts}`, `packages/db/src/queries/trees.ts`, `packages/shared/src/{schemas.ts,types.ts}`, `apps/web/src/{api/client.ts,hooks/useTrees.ts,components/TreeSwitcher.tsx}`, a new `apps/web/src/components/EditTreeDialog.tsx`, `apps/web/src/i18n/locales/{en,th}.json`.
- No change to tree creation, listing, membership, or the default-tree auto-claim flow.
- No new API surface beyond the one PATCH route; no schema/migration changes (`family_trees.name`/`description` columns already exist).
