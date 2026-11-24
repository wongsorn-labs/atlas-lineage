# Tasks

- [x] DB: add `persons.nickname`, `persons.attributes` (encrypted JSON), `relationships.side`, `field_definitions` table (migration 0008, additive)
- [x] Shared: `family.ts` (field types, `kinshipLabel`, `buildHierarchy`), nickname-first person and side in zod schemas and types
- [x] DB queries: field-definition CRUD; attribute encode/decode; side persisted
- [x] API: `/api/field-definitions` (owner-only writes), attribute validation and role-based visibility on persons, `side` on relationships, `/api/relationships/hierarchy`
- [x] API tests: kinship labels and hierarchy walk; attribute validation and visibility; nickname-first controller contract
- [x] Web: nickname-first PersonForm with dynamic fields; side select on parent/child relationships; field-definition dialog for owners; hierarchy view
- [x] Web tests: PersonForm nickname-first and dynamic fields
- [x] Verification: service flow against local Postgres (temporary spec, removed); Playwright smoke against dev server with mocked API (hierarchy rows, add person POST body, owner field dialog, no page errors)
- [x] Photo: upload, square crop, resize to 150px JPEG in the browser; stored encrypted (migration 0009); JSON body limit raised to 300kb
- [ ] Not done: friend and school groups as timelines
- [ ] Not done: migration of existing production data (requires explicit approval and a backup first)
- [ ] Not done: enforce `tree_members` roles (issue #9); owner check currently uses the tree role from membership
- [ ] Not done: i18n strings for new UI are in code defaults, not in `locales/*.json`
