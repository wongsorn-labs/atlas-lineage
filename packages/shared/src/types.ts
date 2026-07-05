export type RelationshipType = 'parent' | 'child' | 'sibling' | 'spouse' | 'partner';

export interface Person {
  id: number;
  treeId: number;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  birthLat: number | null;
  birthLng: number | null;
  birthPlace: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: number;
  treeId: number;
  personId: number;
  relatedPersonId: number;
  type: RelationshipType;
  createdAt: string;
}

export interface CreatePersonInput {
  treeId: number;
  name: string;
  birthYear?: number | null;
  deathYear?: number | null;
  birthLat?: number | null;
  birthLng?: number | null;
  birthPlace?: string | null;
  notes?: string | null;
}

export type UpdatePersonInput = Partial<Omit<CreatePersonInput, 'treeId'>>;

export interface CreateRelationshipInput {
  treeId: number;
  personId: number;
  relatedPersonId: number;
  type: RelationshipType;
}

export type TreeRole = 'owner' | 'editor' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface FamilyTree {
  id: number;
  name: string;
  description: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyTreeMembership extends FamilyTree {
  role: TreeRole;
}

export interface TreeMember {
  id: number;
  treeId: number;
  userId: string;
  role: TreeRole;
  createdAt: string;
}

export interface CreateTreeInput {
  name: string;
  description?: string | null;
}

export interface AddTreeMemberInput {
  userId: string;
  role: TreeRole;
}
