## 1. Shared schema/types

- [x] 1.1 Add `updateTreeSchema` to `packages/shared/src/schemas.ts` (`createTreeSchema.partial()`), following `UpdatePersonSchema`'s pattern.
- [x] 1.2 Add `UpdateTreeInput` to `packages/shared/src/types.ts` (`Partial<CreateTreeInput>`).

## 2. DB query layer

- [x] 2.1 Add `updateTree(treeId: number, input: UpdateTreeInput): Promise<FamilyTree | null>` to `packages/db/src/queries/trees.ts`: build a partial `.set()` object from only the fields present on `input` (mirroring `updatePerson`'s `if (input.field !== undefined)` checks), always include `updatedAt: new Date()`, return `null` if no row matched, otherwise `mapTree(row)`.
- [x] 2.2 Add a query-level test in `packages/db/src/queries/trees.spec.ts` for `updateTree` (mock the `db.update().set().where().returning()` chain, matching `trees.spec.ts`'s existing mock style): updates only supplied fields, returns `null` for a nonexistent tree.

## 3. API layer

- [x] 3.1 Add `apps/api/src/trees/dto/update-tree.dto.ts`: a class-validator DTO with optional `name` (`@IsOptional() @IsString() @Length(1, 100)`) and `description` (`@IsOptional() @IsString() @MaxLength(500)`, nullable), matching the `persons` module's DTO conventions.
- [x] 3.2 Add `TreesService.updateTree(treeId, input)` to `apps/api/src/trees/trees.service.ts`: calls the db query, throws `NotFoundException` if it returns `null` (matching `PersonsService`'s update pattern).
- [x] 3.3 Add `@Patch(':treeId')` to `apps/api/src/trees/trees.controller.ts` with `@UseGuards(TreeMemberGuard)` + `@RequireRoles('owner')`, body typed as `UpdateTreeDto`, delegating to `TreesService.updateTree`.
- [x] 3.4 Extend `apps/api/src/trees/trees.controller.spec.ts` with tests for the new route (delegates to service, returns the updated tree).
- [x] 3.5 Add `apps/api/src/trees/trees.service.spec.ts` (doesn't exist yet) covering `updateTree`'s `NotFoundException` path, or fold it into the controller spec if a service spec still isn't warranted elsewhere in this module — match whichever precedent `trees.controller.spec.ts` already sets for service-level mocking.

## 4. Web: API client, hook, dialog

- [x] 4.1 Add `trees.update(treeId, data)` to `apps/web/src/api/client.ts` (`PATCH /trees/:treeId`), importing `UpdateTreeInput` from `@wongsorn-labs/atlas-lineage-shared`.
- [x] 4.2 Add `useUpdateTree()` to `apps/web/src/hooks/useTrees.ts`, invalidating the `['trees']` query key on success (same key `useCreateTree` invalidates).
- [x] 4.3 Add `apps/web/src/components/EditTreeDialog.tsx`, modeled on `CreateTreeDialog.tsx`: takes a `tree: FamilyTreeMembership` prop, self-gates on `tree.role !== 'owner'` (returning `null`, matching `InviteMemberDialog`), pre-fills the form with `tree.name`/`tree.description`, uses `updateTreeSchema` for `zodResolver`, and PATCHes via `useUpdateTree` on submit.
- [x] 4.4 Wire `EditTreeDialog` into `TreeSwitcher.tsx` next to `InviteMemberDialog`, gated on `currentTree` existing.
- [x] 4.5 Add `tree.editTitle`, `tree.editButton`, `tree.editError` (reusing existing `tree.name`/`tree.description`/`tree.cancel` keys) to `apps/web/src/i18n/locales/en.json` and `th.json`. (No `editSuccess` key — the dialog closes on success, matching `CreateTreeDialog`, rather than showing inline success text like `InviteMemberDialog`.)
- [x] 4.6 Add `apps/web/src/components/EditTreeDialog.test.tsx` covering: pre-filled fields, successful submit calls `api.trees.update` and closes the dialog, and the dialog renders nothing for a non-owner `tree.role`.

## 5. Verification

- [x] 5.1 Run `pnpm --filter @wongsorn-labs/atlas-lineage-db test`, `pnpm --filter @wongsorn-labs/atlas-lineage-api test`, `pnpm --filter @wongsorn-labs/atlas-lineage-web test`.
- [x] 5.2 Manually exercise the edit-tree flow in the browser (dev servers + a real tree) and capture a before/after screenshot pair of `TreeSwitcher` per the repo's UI-change convention.
- [x] 5.3 Run `openspec validate --all` and fix any reported issues.
