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
export type KinRole =
  | 'self' | 'parent' | 'child' | 'sibling' | 'spouse' | 'partner'
  | 'grandparent' | 'grandchild'
  | 'sibling_spouse' | 'sibling_partner' | 'in_law_parent' | 'partner_parent'
  | 'other';

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

/** Two hops reach parents, grandparents, siblings and in-laws; three reach a sibling's partner. */
const MAX_HOPS = 3;

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

/**
 * `viaGender` is the gender of the person the path went through, used for
 * in-law parents: the parent of a spouse is named by the spouse's gender.
 */
export function kinshipLabel(
  role: KinRole,
  gender: HierarchyPersonInput['gender'],
  side: LineSide | null,
  viaGender: HierarchyPersonInput['gender'] = null,
): string {
  const g = gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'unknown';
  const v = viaGender === 'male' ? 'male' : viaGender === 'female' ? 'female' : 'unknown';
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
      return 'แฟน';
    case 'sibling_spouse':
      return g === 'male' ? 'เขย' : g === 'female' ? 'สะใภ้' : 'คู่สมรสของพี่น้อง';
    case 'sibling_partner':
      return 'แฟนของพี่น้อง';
    case 'in_law_parent':
      // Parent of my spouse: wife's parents are พ่อตา/แม่ยาย, husband's are พ่อผัว/แม่ผัว.
      if (v === 'female') return g === 'male' ? 'พ่อตา' : g === 'female' ? 'แม่ยาย' : 'พ่อ/แม่ของคู่สมรส';
      if (v === 'male') return g === 'male' ? 'พ่อผัว' : g === 'female' ? 'แม่ผัว' : 'พ่อ/แม่ของคู่สมรส';
      return 'พ่อ/แม่ของคู่สมรส';
    case 'partner_parent':
      return g === 'male' ? 'พ่อของแฟน' : g === 'female' ? 'แม่ของแฟน' : 'ผู้ปกครองของแฟน';
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

  type Frontier = { id: number; path: string[]; firstSide: LineSide | null; firstId: number | null; generation: number };
  let frontier: Frontier[] = [{ id: rootId, path: [], firstSide: null, firstId: null, generation: 0 }];

  for (let hop = 1; hop <= MAX_HOPS; hop++) {
    const next: Frontier[] = [];
    for (const node of frontier) {
      for (const n of neighbourRoles(node.id, relationships)) {
        if (seen.has(n.otherId) || !byId.has(n.otherId)) continue;
        const path = [...node.path, n.type];
        const firstSide = node.path.length === 0 ? n.side : node.firstSide;
        const firstId = node.path.length === 0 ? n.otherId : node.firstId;
        const generation = node.generation + (n.type === 'parent' ? -1 : n.type === 'child' ? 1 : 0);
        const role = classify(path, n.type);
        // Three-hop people are only useful when they are a sibling's partner or spouse; drop the rest.
        if (role === 'other' && path.length > 2) continue;
        seen.add(n.otherId);
        const person = byId.get(n.otherId)!;
        const via = firstId != null ? byId.get(firstId)?.gender ?? null : null;
        nodes.push({
          personId: n.otherId,
          generation,
          role,
          label: kinshipLabel(role, person.gender, firstSide, via),
        });
        next.push({ id: n.otherId, path, firstSide, firstId, generation });
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
    if (path[0] === 'spouse' && path[1] === 'parent') return 'in_law_parent';
    if (path[0] === 'partner' && path[1] === 'parent') return 'partner_parent';
  }
  if (path.length === 3) {
    if (path[0] === 'parent' && path[1] === 'child' && path[2] === 'spouse') return 'sibling_spouse';
    if (path[0] === 'parent' && path[1] === 'child' && path[2] === 'partner') return 'sibling_partner';
  }
  return 'other';
}
