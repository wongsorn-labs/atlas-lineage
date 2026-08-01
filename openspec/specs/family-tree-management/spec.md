# family-tree-management Specification

## Purpose
Model family trees and per-tree membership roles (owner/editor/viewer), including the default-tree auto-claim flow, and enforce those roles on the endpoints that hold person/relationship data.
## Requirements
### Requirement: Create Family Tree
The system SHALL allow an authenticated user to create a family tree, automatically making the creator its owner.

#### Scenario: Successful tree creation
- **WHEN** an authenticated user POSTs `/api/trees` with a `name` (and optional `description`)
- **THEN** the system creates a `family_trees` row with that user as `ownerId`, inserts a corresponding `tree_members` row with `role = 'owner'`, and returns the created tree

### Requirement: List Trees for Current User
The system SHALL allow an authenticated user to list only the family trees they are a member of, including their role in each.

#### Scenario: List own trees
- **WHEN** an authenticated user GETs `/api/trees`
- **THEN** the system returns every `family_trees` row for which the user has a `tree_members` row, regardless of role, with each returned tree annotated with that user's `role` for it

### Requirement: Add Tree Member With Role
The system SHALL allow adding a user to a tree with one of the roles `owner`, `editor`, or `viewer`, upserting the role if the membership already exists.

#### Scenario: Add new member
- **WHEN** a client POSTs `/api/trees/:treeId/members` with a `userId` and `role`
- **THEN** the system creates a `tree_members` row for that tree/user pair with the given role

#### Scenario: Re-adding an existing member updates their role
- **WHEN** a client POSTs `/api/trees/:treeId/members` for a `userId` that is already a member of that tree
- **THEN** the system updates the existing membership's `role` to the new value instead of creating a duplicate row

### Requirement: Role Hierarchy Is Enforced On Data Endpoints
The system SHALL define an `owner > editor > viewer` role hierarchy via `TreeMemberGuard` and a `RequireRoles` decorator, and SHALL apply that guard to every route that reads or writes person/relationship data, scoping every query by `treeId`.

#### Scenario: Persons and relationships endpoints require tree membership
- **WHEN** examining `PersonsController` and `RelationshipsController`
- **THEN** both apply `@UseGuards(SupabaseAuthGuard, TreeMemberGuard)`, requiring a `treeId` (route param, query param, or body field, depending on the route) and denying requests from users without a `tree_members` row for that tree

#### Scenario: Reads require viewer role or higher, writes require editor role or higher
- **WHEN** a user with only `viewer` role on a tree calls a write endpoint (`POST`/`PATCH`/`DELETE` on persons or relationships)
- **THEN** the system returns 403 Forbidden; the same user calling a read endpoint (`GET`) on that tree succeeds

#### Scenario: Data queries are scoped by treeId
- **WHEN** any persons or relationships query runs (`findAllPersons`, `findPersonById`, `updatePerson`, `deletePerson`, `findAllRelationships`, `findRelationshipsByPerson`, `deleteRelationship`)
- **THEN** the query filters by `tree_id`, so rows belonging to a different tree are never returned or mutated, even if the caller supplies a valid id for a row in another tree — except that a person with an `approved` `person_trees` link to the queried tree is included in reads (see "Read-Only Access To Linked Persons")

#### Scenario: Relationships cannot link persons across trees
- **WHEN** a client POSTs `/api/relationships` with a `treeId` and a `personId`/`relatedPersonId` where either person's origin tree does not match that `treeId` and has no `approved` `person_trees` link to it
- **THEN** the system returns 404 Not Found and does not create the relationship

#### Scenario: Adding a tree member requires the owner role
- **WHEN** a client POSTs `/api/trees/:treeId/members`
- **THEN** the system applies `@UseGuards(TreeMemberGuard)` with `@RequireRoles('owner')`, rejecting the request with 403 Forbidden unless the caller is an `owner` of that tree

### Requirement: Update Family Tree Details
The system SHALL allow a tree's `owner` to update that tree's `name` and/or `description` after creation.

#### Scenario: Owner updates tree name and description
- **WHEN** the tree's owner PATCHes `/api/trees/:treeId` with a `name` and/or `description`
- **THEN** the system updates the `family_trees` row's `name`/`description` for only the fields supplied, leaves unsupplied fields unchanged, and returns the updated tree

#### Scenario: Non-owner member attempts to update tree details
- **WHEN** a user with `editor` or `viewer` role on a tree PATCHes `/api/trees/:treeId`
- **THEN** the system returns 403 Forbidden and does not modify the tree

#### Scenario: Updating a tree the user is not a member of, or that does not exist
- **WHEN** a client PATCHes `/api/trees/:treeId` for a `treeId` that does not exist, or for a tree the caller has no `tree_members` row for
- **THEN** the system returns 404 Not Found and does not modify the tree

#### Scenario: Empty name rejected
- **WHEN** a client PATCHes `/api/trees/:treeId` with an empty-string `name`
- **THEN** the system rejects the request with a validation error and does not modify the tree

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

### Requirement: Request Cross-Tree Person Link
The system SHALL let a tree's `owner` request that an existing person, identified by `personId` and that person's origin `treeId`, become visible in their own tree, creating a `person_trees` row with `status = 'pending'`.

#### Scenario: Owner requests a link to a known person
- **WHEN** the `owner` of tree B sends a link request specifying a `personId` and the origin `treeId` (tree A) they already know out of band
- **THEN** the system creates a `person_trees` row (`personId`, `treeId: B, status: 'pending'`) and does not yet grant tree B any access to the person

#### Scenario: Requesting a link for a person tree B already has access to
- **WHEN** tree B's owner requests a link for a `personId` that already has an `approved` (or `pending`) `person_trees` row for tree B, or whose origin `treeId` already equals B
- **THEN** the system rejects the request without creating a duplicate row

#### Scenario: Non-owner requests a link
- **WHEN** a user with `editor` or `viewer` role on tree B requests a person link
- **THEN** the system returns 403 Forbidden

### Requirement: Approve or Reject Person Link Request
The system SHALL let the origin tree's `owner` approve or reject a pending link request; only an approved link grants the destination tree access.

#### Scenario: Origin owner approves a pending request
- **WHEN** the `owner` of a person's origin tree approves a `pending` `person_trees` row for that person
- **THEN** the system sets that row's `status` to `approved`, and the destination tree gains read access to the person from that point on

#### Scenario: Origin owner rejects a pending request
- **WHEN** the `owner` of a person's origin tree rejects a `pending` `person_trees` row
- **THEN** the system deletes that row and the destination tree gains no access

#### Scenario: Non-origin-owner attempts to decide a request
- **WHEN** a user who is not the `owner` of the person's origin tree attempts to approve or reject a `person_trees` request for that person
- **THEN** the system returns 403 Forbidden

### Requirement: Read-Only Access To Linked Persons
The system SHALL let a destination tree with an `approved` `person_trees` link view the linked person, but SHALL NOT let it modify that person's own fields; only the origin tree may edit them.

#### Scenario: Destination tree views a linked person
- **WHEN** a member of tree B GETs persons scoped to tree B, and a `person_trees` row links a person to tree B with `status = 'approved'`
- **THEN** the response includes that person's current fields (name, dates, coordinates, `birthPlace`, `notes`) as returned by their origin tree

#### Scenario: Destination tree attempts to edit a linked person
- **WHEN** a member of tree B (including an `owner` or `editor`) PATCHes or DELETEs a person whose origin `treeId` is not B, even though B has an `approved` link to them
- **THEN** the system returns 403 Forbidden and does not modify or delete the person

#### Scenario: Origin tree retains full edit rights
- **WHEN** an `editor` or `owner` of the person's origin tree PATCHes that person
- **THEN** the update succeeds exactly as it would for a person with no cross-tree links

### Requirement: Relationships May Reference Linked Persons
The system SHALL let a tree create relationships that reference a person linked into that tree via an `approved` `person_trees` row, in addition to persons whose origin `treeId` matches directly.

#### Scenario: Creating a relationship to a linked person
- **WHEN** a client POSTs `/api/relationships` with `treeId` B, and `personId`/`relatedPersonId` where one side's origin tree is B and the other side has an `approved` `person_trees` link to B
- **THEN** the system creates the relationship, scoped to tree B

#### Scenario: Creating a relationship to an unlinked person from another tree still fails
- **WHEN** a client POSTs `/api/relationships` with `treeId` B and a `personId`/`relatedPersonId` whose origin tree is not B and has no `approved` `person_trees` row for B
- **THEN** the system returns 404 Not Found and does not create the relationship

### Requirement: Unlink Person From Tree
The system SHALL let either the origin tree's `owner` or the destination tree's `owner` remove an `approved` (or `pending`) `person_trees` link at any time, unilaterally.

#### Scenario: Destination owner unlinks
- **WHEN** the destination tree's `owner` removes a `person_trees` link for a person visible in their tree
- **THEN** the system deletes that `person_trees` row and the person (and any relationships that referenced them) is no longer accessible from the destination tree

#### Scenario: Origin owner unlinks
- **WHEN** the origin tree's `owner` removes a `person_trees` link they previously approved
- **THEN** the system deletes that `person_trees` row with the same effect, with no approval or notice required from the destination tree

### Requirement: Linked Access Revoked When Origin Tree Soft-Deleted
The system SHALL treat a person's linked (destination) trees as losing access when that person's origin tree is soft-deleted, consistent with the existing soft-delete lockout.

#### Scenario: Soft-deleting the origin tree hides the person from linked trees
- **WHEN** a person's origin tree is soft-deleted
- **THEN** every tree with an `approved` `person_trees` link to that person can no longer view or reference that person until the origin tree is restored

