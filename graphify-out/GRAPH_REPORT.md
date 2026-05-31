# Graph Report - .  (2026-05-31)

## Corpus Check
- Corpus is ~8,446 words - fits in a single context window. You may not need a graph.

## Summary
- 222 nodes · 371 edges · 20 communities (15 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 11 edges
2. `PersonsService` - 9 edges
3. `PersonsController` - 8 edges
4. `RelationshipsService` - 8 edges
5. `PersonCard()` - 7 edges
6. `RelationshipsController` - 7 edges
7. `encryptField()` - 6 edges
8. `mapPerson()` - 6 edges
9. `decryptField()` - 5 edges
10. `createPerson()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `PersonCard()` --calls--> `useRelationships()`  [EXTRACTED]
  apps/web/src/components/PersonCard.tsx → apps/web/src/hooks/useRelationships.ts
- `createPerson()` --calls--> `encryptField()`  [EXTRACTED]
  packages/db/src/queries/persons.ts → packages/db/src/crypto.ts
- `updatePerson()` --calls--> `encryptField()`  [EXTRACTED]
  packages/db/src/queries/persons.ts → packages/db/src/crypto.ts
- `mapPerson()` --calls--> `decryptField()`  [EXTRACTED]
  packages/db/src/queries/persons.ts → packages/db/src/crypto.ts
- `App()` --calls--> `usePersons()`  [EXTRACTED]
  apps/web/src/App.tsx → apps/web/src/hooks/usePersons.ts

## Communities (20 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (19): api, MapView(), MapViewProps, PersonMarker(), PersonMarkerProps, selectedIcon, COLORS, RelationshipLines() (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (23): PersonCard(), PersonCardProps, SidebarProps, useDeletePerson(), useUpdatePerson(), useCreateRelationship(), useDeleteRelationship(), cn() (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (9): CreatePersonDto, UpdatePersonDto, PersonsController, PersonsService, dto, mockPerson, result, deletePerson() (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (13): createPerson(), findPersonById(), getKey(), mapPerson(), updatePerson(), decrypt(), decryptField(), encrypt() (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (12): FormValues, PersonForm(), PersonFormProps, schema, initial, onCancel, onSubmit, user (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (10): createRelationship(), deleteRelationship(), findAllRelationships(), findRelationshipsByPerson(), mapRelationship(), RelationshipsService, db, sqlite (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (7): HttpExceptionFilter, mockPerson, PersonsModule, mockRel, RelationshipsModule, AppModule, HealthController

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (5): CreateRelationshipDto, RelationshipsController, dto, mockRel, result

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (8): RelationshipForm(), RelationshipFormProps, RelationshipFormValues, TYPES, Label, SelectContent, SelectItem, SelectTrigger

### Community 9 - "Community 9"
Cohesion: 0.27
Nodes (5): created, persons, { result }, handlers, server

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (6): CreatePersonInput, CreateRelationshipInput, Person, Relationship, RelationshipType, UpdatePersonInput

### Community 11 - "Community 11"
Cohesion: 0.4
Nodes (4): CreatePersonSchema, CreateRelationshipSchema, RelationshipTypeSchema, UpdatePersonSchema

## Knowledge Gaps
- **58 isolated node(s):** `RelationshipTypeSchema`, `CreatePersonSchema`, `UpdatePersonSchema`, `CreateRelationshipSchema`, `RelationshipType` (+53 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PersonsService` connect `Community 2` to `Community 3`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `RelationshipsService` connect `Community 5` to `Community 6`, `Community 7`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **What connects `RelationshipTypeSchema`, `CreatePersonSchema`, `UpdatePersonSchema` to the rest of the system?**
  _58 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._