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
The system SHALL allow an authenticated user to list only the family trees they are a member of.

#### Scenario: List own trees
- **WHEN** an authenticated user GETs `/api/trees`
- **THEN** the system returns every `family_trees` row for which the user has a `tree_members` row, regardless of role

### Requirement: Add Tree Member With Role
The system SHALL allow adding a user to a tree with one of the roles `owner`, `editor`, or `viewer`, upserting the role if the membership already exists.

#### Scenario: Add new member
- **WHEN** a client POSTs `/api/trees/:treeId/members` with a `userId` and `role`
- **THEN** the system creates a `tree_members` row for that tree/user pair with the given role

#### Scenario: Re-adding an existing member updates their role
- **WHEN** a client POSTs `/api/trees/:treeId/members` for a `userId` that is already a member of that tree
- **THEN** the system updates the existing membership's `role` to the new value instead of creating a duplicate row

### Requirement: Default Tree Auto-Claim on First Sign-In
The system SHALL let the first user who signs in claim ownership of the pre-seeded default tree (id 1) if it has no owner yet, and SHALL always add that user as an `owner` member of it.

#### Scenario: First user claims default tree
- **WHEN** a user signs in and the default tree (id 1) currently has a null `ownerId`
- **THEN** the system sets that tree's `ownerId` to the signing-in user and adds them as an `owner` member

#### Scenario: Default tree already claimed
- **WHEN** a user signs in and the default tree already has an owner
- **THEN** the system does not change the tree's `ownerId`, and only ensures the signing-in user has an `owner` membership row (idempotent no-op if the tree ownership condition isn't met)

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
- **THEN** the query filters by `tree_id`, so rows belonging to a different tree are never returned or mutated, even if the caller supplies a valid id for a row in another tree

#### Scenario: Relationships cannot link persons across trees
- **WHEN** a client POSTs `/api/relationships` with a `treeId` and a `personId`/`relatedPersonId` where either person does not belong to that tree
- **THEN** the system returns 404 Not Found and does not create the relationship

#### Scenario: Adding a tree member requires the owner role
- **WHEN** a client POSTs `/api/trees/:treeId/members`
- **THEN** the system applies `@UseGuards(TreeMemberGuard)` with `@RequireRoles('owner')`, rejecting the request with 403 Forbidden unless the caller is an `owner` of that tree

