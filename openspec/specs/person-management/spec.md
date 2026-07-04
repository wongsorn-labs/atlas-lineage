# person-management Specification

## Purpose
Provide CRUD operations for person records (name, birth/death years, birth coordinates, encrypted birth place and notes) behind authentication.
## Requirements
### Requirement: Create Person
The system SHALL allow an authenticated user to create a person record with a required name and optional birth/death years, birth coordinates, birth place, and notes.

#### Scenario: Minimal valid person
- **WHEN** a client POSTs `/api/persons` with only a non-empty `name`
- **THEN** the system creates the person with all optional fields stored as null and returns the created record including generated `id`, `createdAt`, and `updatedAt`

#### Scenario: Full person with coordinates
- **WHEN** a client POSTs `/api/persons` with `name`, `birthYear`, `deathYear`, `birthLat` (-90 to 90), `birthLng` (-180 to 180), `birthPlace`, and `notes`
- **THEN** the system creates and returns the person with all fields populated

#### Scenario: Missing required name
- **WHEN** a client POSTs `/api/persons` without a `name` or with an empty string
- **THEN** the system responds with `400 Bad Request` and does not create a record

#### Scenario: Out-of-range coordinates rejected
- **WHEN** a client POSTs `/api/persons` with `birthLat` outside [-90, 90] or `birthLng` outside [-180, 180]
- **THEN** the system responds with `400 Bad Request` and does not create a record

### Requirement: List and Retrieve Persons
The system SHALL allow an authenticated user to list all person records and retrieve a single person by id.

#### Scenario: List all persons
- **WHEN** a client GETs `/api/persons`
- **THEN** the system returns an array of all person records with encrypted fields decrypted

#### Scenario: Retrieve existing person
- **WHEN** a client GETs `/api/persons/:id` for an id that exists
- **THEN** the system returns that person record

#### Scenario: Retrieve missing person
- **WHEN** a client GETs `/api/persons/:id` for an id that does not exist
- **THEN** the system responds with `404 Not Found`

### Requirement: Update Person
The system SHALL allow an authenticated user to partially update a person's fields.

#### Scenario: Partial update
- **WHEN** a client PATCHes `/api/persons/:id` with a subset of updatable fields (e.g. only `notes`)
- **THEN** the system updates only the provided fields, refreshes `updatedAt`, and returns the updated record

#### Scenario: Update non-existent person
- **WHEN** a client PATCHes `/api/persons/:id` for an id that does not exist
- **THEN** the system responds with `404 Not Found`

### Requirement: Delete Person
The system SHALL allow an authenticated user to delete a person, which cascades to remove that person's relationships.

#### Scenario: Delete existing person
- **WHEN** a client DELETEs `/api/persons/:id` for an id that exists
- **THEN** the system removes the person, removes any relationships referencing that person (via database cascade), and responds with `204 No Content`

#### Scenario: Delete non-existent person
- **WHEN** a client DELETEs `/api/persons/:id` for an id that does not exist
- **THEN** the system responds with `404 Not Found`

### Requirement: Authentication Required
The system SHALL require a valid authenticated session for all person endpoints, and SHALL NOT scope results by family tree.

#### Scenario: Unauthenticated request rejected
- **WHEN** a client calls any `/api/persons*` endpoint without a valid `access_token` cookie
- **THEN** the system responds with `401 Unauthorized`

#### Scenario: Any authenticated user sees all persons
- **WHEN** any authenticated user calls `GET /api/persons`
- **THEN** the system returns every person in the database regardless of which family tree the requester belongs to, since person queries are not filtered by `treeId`

