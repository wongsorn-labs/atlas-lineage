import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../client';
import { familyTrees, treeMembers, profiles } from '../schema';
import type { FamilyTree, FamilyTreeMembership, TreeMember, TreeRole, CreateTreeInput, UpdateTreeInput, AddTreeMemberInput, UserProfile } from '@wongsorn-labs/atlas-lineage-shared';

function mapProfile(row: typeof profiles.$inferSelect): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName ?? null,
    avatarUrl: row.avatarUrl ?? null,
    defaultCountry: row.defaultCountry ?? null,
    primaryTreeId: row.primaryTreeId ?? null,
    createdAt: row.createdAt?.toISOString() ?? '',
  };
}

function mapTree(row: typeof familyTrees.$inferSelect): FamilyTree {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    ownerId: row.ownerId ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? '',
    updatedAt: row.updatedAt?.toISOString() ?? '',
  };
}

function mapMember(row: typeof treeMembers.$inferSelect): TreeMember {
  return {
    id: row.id,
    treeId: row.treeId,
    userId: row.userId,
    role: row.role as TreeRole,
    createdAt: row.createdAt?.toISOString() ?? '',
  };
}

export async function findTreesByUser(userId: string): Promise<FamilyTreeMembership[]> {
  const rows = await db
    .select({ tree: familyTrees, role: treeMembers.role })
    .from(treeMembers)
    .innerJoin(familyTrees, eq(treeMembers.treeId, familyTrees.id))
    .where(and(eq(treeMembers.userId, userId), isNull(familyTrees.deletedAt)));
  return rows.map((r) => ({ ...mapTree(r.tree), role: r.role as TreeRole }));
}

export async function findTreeById(treeId: number): Promise<FamilyTree | null> {
  const [row] = await db
    .select()
    .from(familyTrees)
    .where(and(eq(familyTrees.id, treeId), isNull(familyTrees.deletedAt)))
    .limit(1);
  return row ? mapTree(row) : null;
}

export async function createTree(input: CreateTreeInput, ownerId: string): Promise<FamilyTree> {
  const [row] = await db
    .insert(familyTrees)
    .values({ name: input.name, description: input.description ?? null, ownerId })
    .returning();
  await db.insert(treeMembers).values({ treeId: row.id, userId: ownerId, role: 'owner' });
  return mapTree(row);
}

export async function updateTree(treeId: number, input: UpdateTreeInput): Promise<FamilyTree | null> {
  const updates: Partial<typeof familyTrees.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;

  const [row] = await db.update(familyTrees).set(updates).where(eq(familyTrees.id, treeId)).returning();
  return row ? mapTree(row) : null;
}

export async function findMemberRole(treeId: number, userId: string): Promise<TreeRole | null> {
  const [row] = await db
    .select({ role: treeMembers.role })
    .from(treeMembers)
    .innerJoin(familyTrees, eq(treeMembers.treeId, familyTrees.id))
    .where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, userId), isNull(familyTrees.deletedAt)))
    .limit(1);
  return row ? (row.role as TreeRole) : null;
}

export async function addTreeMember(treeId: number, input: AddTreeMemberInput): Promise<TreeMember> {
  const [row] = await db
    .insert(treeMembers)
    .values({ treeId, userId: input.userId, role: input.role })
    .onConflictDoUpdate({
      target: [treeMembers.treeId, treeMembers.userId],
      set: { role: input.role },
    })
    .returning();
  return mapMember(row);
}

export async function upsertProfile(id: string, email: string, displayName?: string | null, avatarUrl?: string | null): Promise<void> {
  await db
    .insert(profiles)
    .values({ id, email, displayName: displayName ?? null, avatarUrl: avatarUrl ?? null })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { email, displayName: displayName ?? null, avatarUrl: avatarUrl ?? null },
    });
}

export async function getProfile(id: string): Promise<UserProfile | null> {
  const [row] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return row ? mapProfile(row) : null;
}

export async function updateProfileSettings(id: string, defaultCountry: string | null): Promise<UserProfile> {
  const [row] = await db
    .update(profiles)
    .set({ defaultCountry })
    .where(eq(profiles.id, id))
    .returning();
  return mapProfile(row);
}

/** Creates a personal tree and sets it primary for a user with zero tree memberships. No-op otherwise. */
export async function createPersonalTreeIfNeeded(userId: string): Promise<void> {
  const [existingMembership] = await db
    .select({ id: treeMembers.id })
    .from(treeMembers)
    .where(eq(treeMembers.userId, userId))
    .limit(1);
  if (existingMembership) return;

  const [tree] = await db
    .insert(familyTrees)
    .values({ name: 'My Family Tree', ownerId: userId })
    .returning();
  await db.insert(treeMembers).values({ treeId: tree.id, userId, role: 'owner' });
  await db.update(profiles).set({ primaryTreeId: tree.id }).where(eq(profiles.id, userId));
}

/** Validates `treeId` is null or a tree the user is a (non-deleted) member of, then sets it primary. */
export async function setPrimaryTree(userId: string, treeId: number | null): Promise<UserProfile | null> {
  if (treeId !== null) {
    const role = await findMemberRole(treeId, userId);
    if (!role) return null;
  }
  const [row] = await db
    .update(profiles)
    .set({ primaryTreeId: treeId })
    .where(eq(profiles.id, userId))
    .returning();
  return row ? mapProfile(row) : null;
}

/** Soft-deletes a tree (owner-checked by the caller) and clears it as primary for every member who had it set. */
export async function softDeleteTree(treeId: number, callerId: string): Promise<FamilyTree | null> {
  const role = await findMemberRole(treeId, callerId);
  if (role !== 'owner') return null;

  const [row] = await db
    .update(familyTrees)
    .set({ deletedAt: new Date() })
    .where(and(eq(familyTrees.id, treeId), isNull(familyTrees.deletedAt)))
    .returning();
  if (!row) return null;

  await db.update(profiles).set({ primaryTreeId: null }).where(eq(profiles.primaryTreeId, treeId));
  return mapTree(row);
}

export async function restoreTree(treeId: number, callerId: string): Promise<FamilyTree | null> {
  const [row] = await db
    .update(familyTrees)
    .set({ deletedAt: null })
    .where(and(eq(familyTrees.id, treeId), eq(familyTrees.ownerId, callerId), isNotNull(familyTrees.deletedAt)))
    .returning();
  return row ? mapTree(row) : null;
}

export async function purgeTree(treeId: number, callerId: string): Promise<boolean> {
  const [row] = await db
    .delete(familyTrees)
    .where(and(eq(familyTrees.id, treeId), eq(familyTrees.ownerId, callerId), isNotNull(familyTrees.deletedAt)))
    .returning();
  return !!row;
}

export async function findTrashedTreesByOwner(ownerId: string): Promise<FamilyTree[]> {
  const rows = await db
    .select()
    .from(familyTrees)
    .where(and(eq(familyTrees.ownerId, ownerId), isNotNull(familyTrees.deletedAt)));
  return rows.map(mapTree);
}
