## ADDED Requirements

### Requirement: Primary Tree Selection
The system SHALL let an authenticated user designate one of their tree memberships as their `primary_tree_id` (stored on `profiles`), and SHALL return it from `GET /api/auth/me`.

#### Scenario: User sets their primary tree
- **WHEN** an authenticated user PATCHes `/api/auth/profile` with a `primaryTreeId` for a tree they have a `tree_members` row for
- **THEN** the system updates `profiles.primary_tree_id` to that tree's id and returns the updated profile

#### Scenario: Rejects a tree the user is not a member of
- **WHEN** an authenticated user PATCHes `/api/auth/profile` with a `primaryTreeId` for a tree they have no `tree_members` row for (including a soft-deleted tree)
- **THEN** the system rejects the request with 404 Not Found and does not modify `profiles.primary_tree_id`

#### Scenario: User clears their primary tree
- **WHEN** an authenticated user PATCHes `/api/auth/profile` with `primaryTreeId: null`
- **THEN** the system sets `profiles.primary_tree_id` to `null`

#### Scenario: Current session exposes the primary tree
- **WHEN** an authenticated user GETs `/api/auth/me`
- **THEN** the response includes `primaryTreeId`, reflecting the current value of `profiles.primary_tree_id` (or `null` if unset)

### Requirement: Personal Tree Created On First Sign-In
The system SHALL, on a user's first sign-in with zero `tree_members` rows, create a new family tree owned by that user and set it as their primary tree.

#### Scenario: First sign-in with no existing tree memberships
- **WHEN** a user signs in (password or OAuth) and has no `tree_members` rows
- **THEN** the system creates a `family_trees` row owned by that user, inserts a `tree_members` row for it with `role = 'owner'`, and sets `profiles.primary_tree_id` to that tree's id

#### Scenario: Sign-in with existing tree memberships is a no-op
- **WHEN** a user signs in and already has at least one `tree_members` row
- **THEN** the system does not create a new tree and does not modify `profiles.primary_tree_id`

### Requirement: Primary Tree Cleared When Deleted
The system SHALL clear `primary_tree_id` to `null` for any profile that references a tree which becomes soft-deleted.

#### Scenario: Soft-deleting a tree clears it as primary for every member who had it set
- **WHEN** a family tree is soft-deleted (`deleted_at` set)
- **THEN** the system sets `profiles.primary_tree_id` to `null` for every profile row whose `primary_tree_id` equals that tree's id
- **AND** does not automatically assign a replacement primary tree

### Requirement: Soft Delete Family Tree
The system SHALL allow a tree's `owner` to soft-delete it by setting `family_trees.deleted_at`, without removing its `persons`, `relationships`, or `tree_members` rows.

#### Scenario: Owner soft-deletes a tree
- **WHEN** the tree's owner sends `DELETE /api/trees/:treeId`
- **THEN** the system sets that tree's `deleted_at` to the current time and returns success, leaving all `persons`, `relationships`, and `tree_members` rows for that tree intact

#### Scenario: Non-owner member attempts to delete a tree
- **WHEN** a user with `editor` or `viewer` role on a tree sends `DELETE /api/trees/:treeId`
- **THEN** the system returns 403 Forbidden and does not modify the tree

#### Scenario: Deleting a tree the user is not a member of, or that does not exist, or is already deleted
- **WHEN** a client sends `DELETE /api/trees/:treeId` for a `treeId` that does not exist, that the caller has no `tree_members` row for, or that is already soft-deleted
- **THEN** the system returns 404 Not Found

### Requirement: Restore Soft-Deleted Tree
The system SHALL allow a soft-deleted tree's `owner` to restore it by clearing `deleted_at`.

#### Scenario: Owner restores a soft-deleted tree
- **WHEN** the tree's owner sends `POST /api/trees/:treeId/restore` for a tree they own that is currently soft-deleted
- **THEN** the system clears that tree's `deleted_at` and the tree, its persons, and its relationships become accessible again through the normal endpoints

#### Scenario: Restoring a tree that is not soft-deleted, or that the user does not own
- **WHEN** a client sends `POST /api/trees/:treeId/restore` for a tree that is not currently soft-deleted, that does not exist, or that the caller does not own
- **THEN** the system returns 404 Not Found and makes no change

### Requirement: Permanently Delete Soft-Deleted Tree
The system SHALL allow a soft-deleted tree's `owner` to permanently and irreversibly delete it, cascading to its `persons`, `relationships`, and `tree_members` rows.

#### Scenario: Owner purges a soft-deleted tree
- **WHEN** the tree's owner sends `DELETE /api/trees/:treeId/purge` for a tree they own that is currently soft-deleted
- **THEN** the system permanently deletes the `family_trees` row along with its `persons`, `relationships`, and `tree_members` rows, and the deletion cannot be undone

#### Scenario: Purging a tree that is not soft-deleted, or that the user does not own
- **WHEN** a client sends `DELETE /api/trees/:treeId/purge` for a tree that is not currently soft-deleted, that does not exist, or that the caller does not own
- **THEN** the system returns 404 Not Found and makes no change

### Requirement: Soft-Deleted Trees Are Hidden From Normal Access
The system SHALL exclude soft-deleted trees from every normal tree, person, and relationship endpoint for every member, including the owner.

#### Scenario: Listing trees excludes soft-deleted ones
- **WHEN** an authenticated user GETs `/api/trees`
- **THEN** the response never includes a tree with a non-null `deleted_at`, even if the caller is its owner

#### Scenario: Tree-scoped data access is blocked once a tree is soft-deleted
- **WHEN** any member (regardless of role, including the owner) accesses `TreeMemberGuard`-protected routes (persons, relationships, tree update/member endpoints) for a soft-deleted `treeId`
- **THEN** the system returns 404 Not Found, identical to accessing a tree the user is not a member of

### Requirement: List Soft-Deleted Trees (Trash)
The system SHALL let a user list the soft-deleted trees they own.

#### Scenario: Owner lists their soft-deleted trees
- **WHEN** an authenticated user GETs `/api/trees/trash`
- **THEN** the system returns every `family_trees` row with a non-null `deleted_at` where the caller is the tree's `owner`

#### Scenario: Non-owner members do not see a soft-deleted tree in trash
- **WHEN** a user who was an `editor` or `viewer` (not `owner`) on a tree GETs `/api/trees/trash` after that tree is soft-deleted
- **THEN** the response does not include that tree

### Requirement: Partner Pairs Render As Merged Card
The system SHALL render a person's first recorded partner relationship (`spouse` or `partner` type) as a single merged card in the family tree chart, instead of two separate cards joined by a connector line.

#### Scenario: A single partner relationship merges into one card
- **WHEN** the family tree chart renders two persons connected by exactly one `spouse` or `partner` relationship between them
- **THEN** the chart displays them as one merged card at that generation/position, and any lines to their children originate from that merged card

#### Scenario: Additional partner relationships fall back to the existing connector rendering
- **WHEN** a person has more than one recorded `spouse`/`partner` relationship
- **THEN** only the first recorded partner relationship (by relationship id) renders as a merged card with that person; every additional partner relationship renders using the pre-existing separate-card-plus-connector-line rendering

## REMOVED Requirements

### Requirement: Default Tree Auto-Claim on First Sign-In
**Reason**: Replaced by "Personal Tree Created On First Sign-In" — a single shared, hardcoded tree (id 1) auto-claimed by whichever user signs in first no longer matches multi-tenant usage. Every user now gets their own personal tree on first sign-in instead of racing to claim a shared one.
**Migration**: No data migration is required for the existing tree with id 1 — it continues to exist as an ordinary tree with whatever owner and members it already has. `claimDefaultTree` is removed; new users who have zero tree memberships get a newly created personal tree instead of being pointed at tree id 1.

The system SHALL let the first user who signs in claim ownership of the pre-seeded default tree (id 1) if it has no owner yet, and SHALL always add that user as an `owner` member of it.

#### Scenario: First user claims default tree
- **WHEN** a user signs in and the default tree (id 1) currently has a null `ownerId`
- **THEN** the system sets that tree's `ownerId` to the signing-in user and adds them as an `owner` member

#### Scenario: Default tree already claimed
- **WHEN** a user signs in and the default tree already has an owner
- **THEN** the system does not change the tree's `ownerId`, and only ensures the signing-in user has an `owner` membership row (idempotent no-op if the tree ownership condition isn't met)
