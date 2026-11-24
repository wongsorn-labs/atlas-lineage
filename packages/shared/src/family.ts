// Family-memory domain: field definitions, kinship labels, and hierarchy building.
// Pure functions only, so they can be shared by the API and the web app and unit-tested.

export type FieldValueType = 'text' | 'number' | 'date' | 'longtext';
export type FieldVisibility = 'members' | 'restricted';
export type LineSide = 'paternal' | 'maternal';

export interface FieldDefinition {
  id: number;
  treeId: number;
  key: string;
  label: string;
  category: string;
  valueType: FieldValueType;
  visibility: FieldVisibility;
  createdBy: string | null;
  createdAt: string;
}

export type AttributeValue = string | number | null;
export type PersonAttributes = Record<string, AttributeValue>;

/** Relationship roles as seen from a node in the hierarchy. */
export type KinRole = 'self' | 'parent' | 'child' | 'sibling' | 'spouse' | 'partner' | 'grandparent' | 'grandchild' | 'other';

export interface HierarchyPersonInput {
  id: number;
  name: string;
  nickname: string | null;
  gender: 'male' | 'female' | 'unspecified' | null;
}

export interface HierarchyRelationshipInput {
  personId: number;
  relatedPersonId: number;
  type: string;
  side: LineSide | null;
}

export interface HierarchyNode {
  personId: number;
  generation: number;
  role: KinRole;
  label: string;
}

const MAX_HOPS = 2;

/** Inverse of a stored relationship type: `parent` (A is B's parent) read from B's side is `child`. */
function invertType(type: string): string {
  if (type === 'parent') return 'child';
  if (type === 'child') return 'parent';
  return type;
}

/** The role of the *other* person relative to the node we are standing on. */
function neighbourRoles(
  nodeId: number,
  relationships: HierarchyRelationshipInput[],
): { otherId: number; type: string; side: LineSide | null }[] {
  const out: { otherId: number; type: string; side: LineSide | null }[] = [];
  for (const r of relationships) {
    if (r.personId === nodeId && r.relatedPersonId !== nodeId) {
      out.push({ otherId: r.relatedPersonId, type: invertType(r.type), side: r.side });
    } else if (r.relatedPersonId === nodeId && r.personId !== nodeId) {
      out.push({ otherId: r.personId, type: r.type, side: r.side });
    }
  }
  return out;
}

export function kinshipLabel(
  role: KinRole,
  gender: HierarchyPersonInput['gender'],
  side: LineSide | null,
): string {
  const g = gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'unknown';
  switch (role) {
    case 'self':
      return 'ตัวเอง';
    case 'parent':
      return g === 'male' ? 'พ่อ' : g === 'female' ? 'แม่' : 'ผู้ปกครอง';
    case 'child':
      return g === 'male' ? 'ลูกชาย' : g === 'female' ? 'ลูกสาว' : 'ลูก';
    case 'sibling':
      return g === 'male' ? 'พี่น้องชาย' : g === 'female' ? 'พี่น้องหญิง' : 'พี่น้อง';
    case 'spouse':
      return g === 'male' ? 'สามี' : g === 'female' ? 'ภรรยา' : 'คู่สมรส';
    case 'partner':
      return 'คู่ชีวิต';
    case 'grandparent':
      if (side === 'paternal') return g === 'female' ? 'ย่า' : 'ปู่';
      if (side === 'maternal') return g === 'female' ? 'ยาย' : 'ตา';
      return g === 'female' ? 'ย่า/ยาย' : 'ปู่/ตา';
    case 'grandchild':
      return g === 'male' ? 'หลานชาย' : g === 'female' ? 'หลานสาว' : 'หลาน';
    default:
      return 'ญาติ';
  }
}

/**
 * Breadth-first walk from `rootId` over stored relationships, up to two hops.
 * The first hop decides the family line used for grandparent labels.
 * Returns nodes in order of discovery, root included with role `self`.
 */
export function buildHierarchy(
  rootId: number,
  people: HierarchyPersonInput[],
  relationships: HierarchyRelationshipInput[],
): HierarchyNode[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  if (!byId.has(rootId)) return [];

  const nodes: HierarchyNode[] = [];
  const seen = new Set<number>([rootId]);
  const root = byId.get(rootId)!;
  nodes.push({ personId: rootId, generation: 0, role: 'self', label: kinshipLabel('self', root.gender, null) });

  type Frontier = { id: number; path: string[]; firstSide: LineSide | null; generation: number };
  let frontier: Frontier[] = [{ id: rootId, path: [], firstSide: null, generation: 0 }];

  for (let hop = 1; hop <= MAX_HOPS; hop++) {
    const next: Frontier[] = [];
    for (const node of frontier) {
      for (const n of neighbourRoles(node.id, relationships)) {
        if (seen.has(n.otherId) || !byId.has(n.otherId)) continue;
        seen.add(n.otherId);
        const path = [...node.path, n.type];
        const firstSide = node.path.length === 0 ? n.side : node.firstSide;
        const generation = node.generation + (n.type === 'parent' ? -1 : n.type === 'child' ? 1 : 0);
        const role = classify(path, n.type);
        const person = byId.get(n.otherId)!;
        nodes.push({
          personId: n.otherId,
          generation,
          role,
          label: kinshipLabel(role, person.gender, firstSide),
        });
        next.push({ id: n.otherId, path, firstSide, generation });
      }
    }
    frontier = next;
  }
  return nodes;
}

function classify(path: string[], last: string): KinRole {
  if (path.length === 1) {
    if (last === 'parent') return 'parent';
    if (last === 'child') return 'child';
    if (last === 'sibling') return 'sibling';
    if (last === 'spouse') return 'spouse';
    if (last === 'partner') return 'partner';
  }
  if (path.length === 2) {
    if (path[0] === 'parent' && path[1] === 'parent') return 'grandparent';
    if (path[0] === 'child' && path[1] === 'child') return 'grandchild';
    if (path[0] === 'parent' && path[1] === 'child') return 'sibling';
  }
  return 'other';
}
