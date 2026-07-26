## ADDED Requirements

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

### Requirement: Role Hierarchy Is Defined But Not Enforced On Data Endpoints
The system SHALL define an `owner > editor > viewer` role hierarchy via `TreeMemberGuard` and a `RequireRoles` decorator; however, as implemented today, no controller route MUST be considered role-protected unless it explicitly applies that guard — and currently none do.

#### Scenario: Guard exists but is unused
- **WHEN** examining `TreesController`, `PersonsController`, and `RelationshipsController`
- **THEN** none of them apply `@UseGuards(TreeMemberGuard)` or `@RequireRoles(...)` — only `SupabaseAuthGuard` (authentication, not authorization) guards these routes

#### Scenario: Persons and relationships are not tree-scoped
- **WHEN** any authenticated user (regardless of tree membership or role) calls the persons or relationships endpoints
- **THEN** the request succeeds against the entire dataset, because `packages/db/src/queries/persons.ts` and `relationships.ts` do not filter by `treeId` and no route enforces tree membership
