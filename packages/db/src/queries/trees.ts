import { eq, and } from 'drizzle-orm';
import { db } from '../client';
import { familyTrees, treeMembers, profiles } from '../schema';
import type { FamilyTree, TreeMember, TreeRole, CreateTreeInput, AddTreeMemberInput } from '@wongsorn-labs/atlas-lineage-shared';

function mapTree(row: typeof familyTrees.$inferSelect): FamilyTree {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    ownerId: row.ownerId ?? null,
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

export async function findTreesByUser(userId: string): Promise<FamilyTree[]> {
  const rows = await db
    .select({ tree: familyTrees })
    .from(treeMembers)
    .innerJoin(familyTrees, eq(treeMembers.treeId, familyTrees.id))
    .where(eq(treeMembers.userId, userId));
  return rows.map((r) => mapTree(r.tree));
}

export async function findTreeById(treeId: number): Promise<FamilyTree | null> {
  const [row] = await db.select().from(familyTrees).where(eq(familyTrees.id, treeId)).limit(1);
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

export async function findMemberRole(treeId: number, userId: string): Promise<TreeRole | null> {
  const [row] = await db
    .select()
    .from(treeMembers)
    .where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, userId)))
    .limit(1);
  return row ? (row.role as TreeRole) : null;
}

export async function addTreeMember(treeId: number, input: AddTreeMemberInput): Promise<TreeMember> {
  const [row] = await db
    .insert(treeMembers)
    .values({ treeId, userId: input.userId, role: input.role })
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

export async function claimDefaultTree(userId: string): Promise<void> {
  const [defaultTree] = await db
    .select()
    .from(familyTrees)
    .where(eq(familyTrees.id, 1))
    .limit(1);
  if (defaultTree && defaultTree.ownerId === null) {
    await db.update(familyTrees).set({ ownerId: userId }).where(eq(familyTrees.id, 1));
    await db
      .insert(treeMembers)
      .values({ treeId: 1, userId, role: 'owner' })
      .onConflictDoNothing();
  }
}
