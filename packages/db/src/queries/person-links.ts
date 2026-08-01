import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import { personTrees, persons, familyTrees } from '../schema';
import type { PersonTreeLink } from '@wongsorn-labs/atlas-lineage-shared';

function mapLink(row: typeof personTrees.$inferSelect): PersonTreeLink {
  return {
    id: row.id,
    personId: row.personId,
    treeId: row.treeId,
    status: row.status,
    requestedBy: row.requestedBy,
    createdAt: row.createdAt?.toISOString() ?? '',
    decidedAt: row.decidedAt?.toISOString() ?? null,
  };
}

export type RequestPersonLinkResult =
  | { ok: true; link: PersonTreeLink }
  | { ok: false; reason: 'person_not_found' | 'already_own_person' | 'link_already_exists' };

export async function requestPersonLink(
  personId: number,
  treeId: number,
  requestedBy: string,
): Promise<RequestPersonLinkResult> {
  const [person] = await db.select().from(persons).where(eq(persons.id, personId)).limit(1);
  if (!person) return { ok: false, reason: 'person_not_found' };
  if (person.treeId === treeId) return { ok: false, reason: 'already_own_person' };

  const [existing] = await db
    .select()
    .from(personTrees)
    .where(and(eq(personTrees.personId, personId), eq(personTrees.treeId, treeId)))
    .limit(1);
  if (existing) return { ok: false, reason: 'link_already_exists' };

  const [row] = await db
    .insert(personTrees)
    .values({ personId, treeId, requestedBy, status: 'pending' })
    .returning();
  return { ok: true, link: mapLink(row) };
}

export async function findPersonTreeLinkById(id: number): Promise<PersonTreeLink | null> {
  const [row] = await db.select().from(personTrees).where(eq(personTrees.id, id)).limit(1);
  return row ? mapLink(row) : null;
}

export async function findLinkByPersonAndTree(personId: number, treeId: number): Promise<PersonTreeLink | null> {
  const [row] = await db
    .select()
    .from(personTrees)
    .where(and(eq(personTrees.personId, personId), eq(personTrees.treeId, treeId)))
    .limit(1);
  return row ? mapLink(row) : null;
}

export async function getPersonOriginTreeId(personId: number): Promise<number | null> {
  const [row] = await db.select({ treeId: persons.treeId }).from(persons).where(eq(persons.id, personId)).limit(1);
  return row?.treeId ?? null;
}

export async function approvePersonLink(id: number): Promise<PersonTreeLink | null> {
  const [row] = await db
    .update(personTrees)
    .set({ status: 'approved', decidedAt: new Date() })
    .where(and(eq(personTrees.id, id), eq(personTrees.status, 'pending')))
    .returning();
  return row ? mapLink(row) : null;
}

export async function rejectPersonLink(id: number): Promise<boolean> {
  const [row] = await db
    .delete(personTrees)
    .where(and(eq(personTrees.id, id), eq(personTrees.status, 'pending')))
    .returning();
  return !!row;
}

export async function unlinkPersonTree(id: number): Promise<boolean> {
  const [row] = await db.delete(personTrees).where(eq(personTrees.id, id)).returning();
  return !!row;
}

export async function findPendingLinkRequestsForOriginOwner(ownerId: string): Promise<PersonTreeLink[]> {
  const rows = await db
    .select({ link: personTrees })
    .from(personTrees)
    .innerJoin(persons, eq(personTrees.personId, persons.id))
    .innerJoin(familyTrees, eq(persons.treeId, familyTrees.id))
    .where(and(eq(personTrees.status, 'pending'), eq(familyTrees.ownerId, ownerId)));
  return rows.map((r) => mapLink(r.link));
}

/** Person ids visible to `treeId` via an approved link whose origin tree is not soft-deleted. */
export async function findApprovedLinkedPersonIds(treeId: number): Promise<number[]> {
  const rows = await db
    .select({ personId: personTrees.personId })
    .from(personTrees)
    .innerJoin(persons, eq(personTrees.personId, persons.id))
    .innerJoin(familyTrees, eq(persons.treeId, familyTrees.id))
    .where(and(
      eq(personTrees.treeId, treeId),
      eq(personTrees.status, 'approved'),
      isNull(familyTrees.deletedAt),
    ));
  return rows.map((r) => r.personId);
}
