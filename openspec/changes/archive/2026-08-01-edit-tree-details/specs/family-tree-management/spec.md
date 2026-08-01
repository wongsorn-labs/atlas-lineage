## ADDED Requirements

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
