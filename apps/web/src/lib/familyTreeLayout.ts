import type { Person, Relationship } from '@wongsorn-labs/atlas-lineage-shared';

export const CARD_WIDTH = 140;
export const CARD_HEIGHT = 76;
const COL_GAP = 32;
const ROW_GAP = 96;
const COL_STEP = CARD_WIDTH + COL_GAP;
const ROW_STEP = CARD_HEIGHT + ROW_GAP;

export interface PersonNode {
  person: Person;
  generation: number;
  x: number;
  y: number;
}

export interface PartnerLink {
  a: PersonNode;
  b: PersonNode;
}

export interface ParentGroupLink {
  parents: PersonNode[];
  children: PersonNode[];
}

export interface FamilyTreeLayout {
  nodes: PersonNode[];
  width: number;
  height: number;
  partnerLinks: PartnerLink[];
  parentGroupLinks: ParentGroupLink[];
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function computeFamilyTreeLayout(persons: Person[], relationships: Relationship[]): FamilyTreeLayout {
  const personIds = new Set(persons.map((p) => p.id));
  const childToParents = new Map<number, Set<number>>();
  const partnerPairs = new Map<string, [number, number]>();

  for (const rel of relationships) {
    if (!personIds.has(rel.personId) || !personIds.has(rel.relatedPersonId)) continue;
    if (rel.type === 'parent') {
      addParent(childToParents, rel.relatedPersonId, rel.personId);
    } else if (rel.type === 'child') {
      addParent(childToParents, rel.personId, rel.relatedPersonId);
    } else if (rel.type === 'spouse' || rel.type === 'partner') {
      const key = pairKey(rel.personId, rel.relatedPersonId);
      if (!partnerPairs.has(key)) partnerPairs.set(key, [rel.personId, rel.relatedPersonId]);
    }
  }

  // Generation = longest chain of recorded parents above a person. Guarded
  // against cycles (shouldn't exist in real data, but relationships are
  // free-form user input) by tracking the current recursion stack.
  const generationCache = new Map<number, number>();
  function computeGeneration(personId: number, stack: Set<number>): number {
    if (generationCache.has(personId)) return generationCache.get(personId)!;
    if (stack.has(personId)) return 0;
    const parents = childToParents.get(personId);
    if (!parents || parents.size === 0) {
      generationCache.set(personId, 0);
      return 0;
    }
    stack.add(personId);
    let max = 0;
    for (const parentId of parents) {
      max = Math.max(max, computeGeneration(parentId, stack) + 1);
    }
    stack.delete(personId);
    generationCache.set(personId, max);
    return max;
  }

  const generation = new Map<number, number>();
  for (const p of persons) generation.set(p.id, computeGeneration(p.id, new Set()));

  // Partners should sit on the same row even if one side's own ancestry
  // (or lack of it) would otherwise put them a generation apart.
  for (let i = 0; i < 3; i++) {
    let changed = false;
    for (const [a, b] of partnerPairs.values()) {
      const ga = generation.get(a)!;
      const gb = generation.get(b)!;
      if (ga !== gb) {
        generation.set(a, Math.max(ga, gb));
        generation.set(b, Math.max(ga, gb));
        changed = true;
      }
    }
    if (!changed) break;
  }

  const rows = new Map<number, number[]>();
  for (const p of persons) {
    const g = generation.get(p.id)!;
    if (!rows.has(g)) rows.set(g, []);
    rows.get(g)!.push(p.id);
  }

  const sortedGenerations = [...rows.keys()].sort((a, b) => a - b);
  const xById = new Map<number, number>();

  for (const g of sortedGenerations) {
    const ids = rows.get(g)!;
    const parentGen = g > 0 ? sortedGenerations.filter((r) => r < g).at(-1) : undefined;
    const barycenter = (id: number): number => {
      const parents = childToParents.get(id);
      if (!parents || parents.size === 0 || parentGen === undefined) return id;
      const xs = [...parents].map((pid) => xById.get(pid)).filter((x): x is number => x != null);
      if (xs.length === 0) return id;
      return xs.reduce((sum, x) => sum + x, 0) / xs.length;
    };

    const ordered = [...ids].sort((a, b) => barycenter(a) - barycenter(b));

    // Pull partners to sit immediately next to each other.
    const placed: number[] = [];
    const consumed = new Set<number>();
    for (const id of ordered) {
      if (consumed.has(id)) continue;
      placed.push(id);
      consumed.add(id);
      for (const [a, b] of partnerPairs.values()) {
        const partnerId = a === id ? b : b === id ? a : null;
        if (partnerId != null && ids.includes(partnerId) && !consumed.has(partnerId)) {
          placed.push(partnerId);
          consumed.add(partnerId);
        }
      }
    }

    placed.forEach((id, i) => xById.set(id, i * COL_STEP));
  }

  const nodes: PersonNode[] = persons.map((p) => ({
    person: p,
    generation: generation.get(p.id)!,
    x: xById.get(p.id) ?? 0,
    y: generation.get(p.id)! * ROW_STEP,
  }));
  const nodeById = new Map(nodes.map((n) => [n.person.id, n]));

  const partnerLinks: PartnerLink[] = [...partnerPairs.values()]
    .map(([a, b]) => {
      const nodeA = nodeById.get(a);
      const nodeB = nodeById.get(b);
      if (!nodeA || !nodeB || nodeA.generation !== nodeB.generation) return null;
      return nodeA.x <= nodeB.x ? { a: nodeA, b: nodeB } : { a: nodeB, b: nodeA };
    })
    .filter((l): l is PartnerLink => l !== null);

  // Group children by their exact parent set so full siblings share one
  // drop line, and children with only one recorded parent still connect.
  const groupKeyToChildren = new Map<string, { parentIds: number[]; children: number[] }>();
  for (const [childId, parents] of childToParents) {
    if (!personIds.has(childId)) continue;
    const parentIds = [...parents].filter((pid) => personIds.has(pid)).sort((a, b) => a - b);
    if (parentIds.length === 0) continue;
    const key = parentIds.join(',');
    if (!groupKeyToChildren.has(key)) groupKeyToChildren.set(key, { parentIds, children: [] });
    groupKeyToChildren.get(key)!.children.push(childId);
  }

  const parentGroupLinks: ParentGroupLink[] = [...groupKeyToChildren.values()]
    .map(({ parentIds, children }) => {
      const parents = parentIds.map((id) => nodeById.get(id)).filter((n): n is PersonNode => n != null);
      const childNodes = children.map((id) => nodeById.get(id)).filter((n): n is PersonNode => n != null);
      if (parents.length === 0 || childNodes.length === 0) return null;
      return { parents, children: childNodes.sort((a, b) => a.x - b.x) };
    })
    .filter((l): l is ParentGroupLink => l !== null);

  const maxX = nodes.length > 0 ? Math.max(...nodes.map((n) => n.x)) : 0;
  const maxY = nodes.length > 0 ? Math.max(...nodes.map((n) => n.y)) : 0;

  return {
    nodes,
    width: maxX + CARD_WIDTH,
    height: maxY + CARD_HEIGHT,
    partnerLinks,
    parentGroupLinks,
  };
}

function addParent(map: Map<number, Set<number>>, childId: number, parentId: number) {
  if (!map.has(childId)) map.set(childId, new Set());
  map.get(childId)!.add(parentId);
}
