# relationship-management Specification

## Purpose
Provide CRUD operations for typed relationship edges between two persons, including cascade cleanup when a related person is deleted.
## Requirements
### Requirement: Create Relationship
The system SHALL allow an authenticated user to create a directed, typed relationship between two existing persons.

#### Scenario: Valid relationship
- **WHEN** a client POSTs `/api/relationships` with a positive integer `personId`, a positive integer `relatedPersonId`, and `type` equal to one of `parent`, `child`, `sibling`, `spouse`, `partner`
- **THEN** the system creates and returns the relationship with generated `id` and `createdAt`

#### Scenario: Invalid relationship type rejected
- **WHEN** a client POSTs `/api/relationships` with a `type` value outside the allowed enum
- **THEN** the system responds with `400 Bad Request` and does not create a record

#### Scenario: Non-positive person id rejected
- **WHEN** a client POSTs `/api/relationships` with `personId` or `relatedPersonId` that is zero, negative, or not an integer
- **THEN** the system responds with `400 Bad Request`

### Requirement: List Relationships
The system SHALL allow an authenticated user to list all relationships, or list only relationships involving a specific person.

#### Scenario: List all relationships
- **WHEN** a client GETs `/api/relationships`
- **THEN** the system returns every relationship record

#### Scenario: List relationships for a person
- **WHEN** a client GETs `/api/relationships/person/:personId`
- **THEN** the system returns every relationship where the person is either `personId` or `relatedPersonId`

### Requirement: Delete Relationship
The system SHALL allow an authenticated user to delete a relationship by id.

#### Scenario: Delete existing relationship
- **WHEN** a client DELETEs `/api/relationships/:id` for an id that exists
- **THEN** the system removes the relationship and responds with `204 No Content`

#### Scenario: Delete non-existent relationship
- **WHEN** a client DELETEs `/api/relationships/:id` for an id that does not exist
- **THEN** the system responds with `404 Not Found`

### Requirement: Cascade Delete on Person Removal
The system SHALL automatically remove relationships that reference a deleted person via a database-level foreign key cascade.

#### Scenario: Deleting a person removes its relationships
- **WHEN** a person referenced by one or more relationships (as `personId` or `relatedPersonId`) is deleted
- **THEN** all relationship rows referencing that person are also deleted, with no orphaned relationships remaining

