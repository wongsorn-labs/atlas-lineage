## Why

Users with multiple family trees have no way to designate which one should open by default, partner pairs clutter the family tree chart as two separate cards connected by a line instead of reading as a single couple, and trees can never be removed once created — there is no delete endpoint at all today, hard or soft. A fourth gap surfaced during review: a person who belongs to more than one family (e.g. an in-law or a shared ancestor between two relatives' trees) can only be re-entered as a duplicate record in each tree today, since `persons.tree_id` ties a person to exactly one tree. These four gaps sit in the same `family-tree-management` capability and are being addressed together.

## What Changes

- Add `profiles.primary_tree_id` (nullable FK → `family_trees.id`). A user's primary tree always loads first on sign-in, overriding the web app's `localStorage`-based "last selected tree" behavior; `TreeSwitcher` still allows changing trees mid-session.
- Extend `PATCH /api/auth/profile` to accept `primaryTreeId`, validated against the caller's own tree memberships.
- **BREAKING**: Retire the hardcoded `claimDefaultTree()` flow (tree id=1 auto-claimed as owner on first sign-in). Replace it with: on first sign-in when a user has zero tree memberships, create a personal family tree for them and set it as their `primary_tree_id`.
- Render partner pairs (`relationships.type` of `spouse` or `partner`) as a single merged card in the `FamilyChart` SVG view instead of two adjacent cards joined by a connector line. Only a person's first recorded partner relationship merges; any additional partner relationships fall back to today's separate-card rendering.
- Add soft delete for family trees: `family_trees.deleted_at` (nullable timestamp), `DELETE /api/trees/:treeId` (owner-only, sets `deleted_at`), `POST /api/trees/:treeId/restore` (owner-only, clears `deleted_at`), and `DELETE /api/trees/:treeId/purge` (owner-only, permanently hard-deletes a soft-deleted tree via existing cascading FKs). No scheduled auto-purge.
- Once a tree is soft-deleted, `TreeMemberGuard` treats it as not found for all members (matching persons/relationships access), except the owner can list it via a Trash view to restore or purge.
- If a user's primary tree is soft-deleted, `primary_tree_id` is cleared to `null` rather than reassigned.
- Web: a Trash section in the tree switcher (owner-only) with restore/purge actions, purge gated by the existing `ConfirmDialog`.
- Add cross-tree person sharing so the same real-world person can be referenced from more than one tree without duplicating their record: a new `person_trees` table records approved (and pending) links between a person and a tree beyond the tree that created them (`persons.tree_id`, unchanged, remains that person's origin tree).
- A tree's `owner` requests a link by supplying an existing `personId` and the origin `treeId` they already know out of band (no cross-tree search/discovery, to avoid leaking one tree's persons to another). The origin tree's `owner` approves or rejects the request; nothing is shared until approved.
- Once approved, the linked (destination) tree can view the shared person — including creating relationships in that tree that reference them — but cannot edit the person's own fields (name, dates, coordinates, `birthPlace`, `notes`); only the origin tree can edit them. **BREAKING**: this changes the meaning of the existing "relationships cannot link persons across trees" rule — a relationship may now reference a person linked into the calling tree, not only persons whose `tree_id` equals it directly.
- Either the origin or destination tree's `owner` can unlink at any time, unilaterally, with no counter-approval required.
- Soft-deleting the origin tree revokes destination trees' access to the linked person immediately, consistent with this change's soft-delete lockout behavior.

## Capabilities

### New Capabilities

(none — all changes extend the existing `family-tree-management` capability)

### Modified Capabilities

- `family-tree-management`: adds primary-tree selection, retires the id=1 default-tree auto-claim in favor of per-user personal-tree creation, adds soft delete (delete/restore/purge) with Trash visibility scoped to owners, and adds cross-tree person sharing (request/approve/unlink), which modifies the existing cross-tree relationship restriction.

## Impact

- **Schema** (`packages/db/src/schema.ts`, migration): `profiles.primary_tree_id`, `family_trees.deleted_at`, new `person_trees` table (`personId`, `treeId`, `status` [`pending`/`approved`], `requestedBy`, `createdAt`, `decidedAt`).
- **`packages/db`**: `queries/trees.ts` — replace `claimDefaultTree`, add primary-tree get/set, add soft-delete/restore/purge/trash-list queries, filter all tree reads by `deleted_at IS NULL`; new `queries/person-links.ts` (or similar) for request/approve/reject/unlink and for resolving which trees a person is visible to.
- **`apps/api`**: `TreesController`/`TreesService` — new `DELETE/POST` routes; `AuthController`/profile DTO — accept `primaryTreeId`; `TreeMemberGuard` — treat soft-deleted trees as not found; `PersonsController`/`RelationshipsController` — resolve person visibility/editability through both `persons.tree_id` and approved `person_trees` rows.
- **`packages/shared`**: extend `FamilyTree`/`UserProfile` types and Zod schemas for the new fields; add `PersonTreeLink` type.
- **`apps/web`**: `TreeContext` (primary-first load logic), `SettingsDialog` (set primary tree), `TreeSwitcher`/new Trash UI, `familyTreeLayout.ts` + `FamilyChart.tsx` (merged partner card rendering and geometry), new UI for requesting/approving/unlinking a cross-tree person and for read-only rendering of a linked person's card.
- **No new dependencies.**
