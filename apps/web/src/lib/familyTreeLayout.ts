import type { Person, Relationship } from '@wongsorn-labs/atlas-lineage-shared';

export const CARD_WIDTH = 140;
export const CARD_HEIGHT = 76;
const COL_GAP = 32;
const ROW_GAP = 96;
const COL_STEP = CARD_WIDTH + COL_GAP;
const ROW_STEP = CARD_HEIGHT + ROW_GAP;
/** Seam between two merged partners' avatars — narrower than COL_GAP so the pair reads as one fused card. */
const MERGED_SEAM = 16;
export const MERGED_CARD_WIDTH = CARD_WIDTH * 2 + MERGED_SEAM;

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

/** A partner pair rendered as a single fused card (see MERGED_CARD_WIDTH) instead of two cards + a connector. */
export interface MergedPair {
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
  mergedPairs: MergedPair[];
  parentGroupLinks: ParentGroupLink[];
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function computeFamilyTreeLayout(persons: Person[], relationships: Relationship[]): FamilyTreeLayout {
  const personIds = new Set(persons.map((p) => p.id));
  const personById = new Map(persons.map((p) => [p.id, p]));
  const childToParents = new Map<number, Set<number>>();
  const partnerPairs = new Map<string, { a: number; b: number; relId: number }>();

  for (const rel of relationships) {
    if (!personIds.has(rel.personId) || !personIds.has(rel.relatedPersonId)) continue;
    if (rel.type === 'parent') {
      addParent(childToParents, rel.relatedPersonId, rel.personId);
    } else if (rel.type === 'child') {
      addParent(childToParents, rel.personId, rel.relatedPersonId);
    } else if (rel.type === 'spouse' || rel.type === 'partner') {
      const key = pairKey(rel.personId, rel.relatedPersonId);
      if (!partnerPairs.has(key)) partnerPairs.set(key, { a: rel.personId, b: rel.relatedPersonId, relId: rel.id });
    }
  }

  // A pair only merges into one fused card when it is the lowest-id partner
  // relationship for BOTH people — i.e. each person's "first recorded"
  // partner. Anyone with additional partner rows keeps the older
  // separate-card-plus-connector rendering for those extra relationships.
  const minPartnerRelId = new Map<number, number>();
  for (const { a, b, relId } of partnerPairs.values()) {
    for (const id of [a, b]) {
      const current = minPartnerRelId.get(id);
      if (current === undefined || relId < current) minPartnerRelId.set(id, relId);
    }
  }
  const mergedPairKeys = new Set<string>();
  for (const [key, { a, b, relId }] of partnerPairs) {
    if (minPartnerRelId.get(a) === relId && minPartnerRelId.get(b) === relId) mergedPairKeys.add(key);
  }

  // Group children by their exact parent set so full siblings share one
  // drop line and one centering block, and children with only one recorded
  // parent still connect/center on that parent alone. Computed up front
  // (depends only on childToParents) so both the centering pass below and
  // parentGroupLinks at the end can share one source of truth.
  const groupKeyToChildren = new Map<string, { parentIds: number[]; children: number[] }>();
  for (const [childId, parents] of childToParents) {
    if (!personIds.has(childId)) continue;
    const parentIds = [...parents].filter((pid) => personIds.has(pid)).sort((a, b) => a - b);
    if (parentIds.length === 0) continue;
    const key = parentIds.join(',');
    if (!groupKeyToChildren.has(key)) groupKeyToChildren.set(key, { parentIds, children: [] });
    groupKeyToChildren.get(key)!.children.push(childId);
  }
  const childGroupKeyById = new Map<number, string>();
  for (const [key, { children }] of groupKeyToChildren) {
    for (const childId of children) childGroupKeyById.set(childId, key);
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
    for (const { a, b } of partnerPairs.values()) {
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
  const mergedPairIds: [number, number][] = [];

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

    // Siblings share the same barycenter (same parents), so the tie-break
    // is what actually orders them: birth year, oldest first, unknown
    // birth years sorting last rather than arbitrarily interleaving.
    const birthYearOf = (id: number): number => personById.get(id)?.birthYear ?? Number.POSITIVE_INFINITY;
    const ordered = [...ids].sort((a, b) => {
      const diff = barycenter(a) - barycenter(b);
      return diff !== 0 ? diff : birthYearOf(a) - birthYearOf(b);
    });

    // Pull partners to sit immediately next to each other.
    const placed: number[] = [];
    const consumed = new Set<number>();
    for (const id of ordered) {
      if (consumed.has(id)) continue;
      placed.push(id);
      consumed.add(id);
      for (const { a, b } of partnerPairs.values()) {
        const partnerId = a === id ? b : b === id ? a : null;
        if (partnerId != null && ids.includes(partnerId) && !consumed.has(partnerId)) {
          placed.push(partnerId);
          consumed.add(partnerId);
        }
      }
    }

    // Walk the row left-to-right; a merge-eligible pair shares one x (the
    // fused card's left edge) and the cursor advances by the wider merged
    // width instead of a normal single-card column step.
    let cursor = 0;
    for (let i = 0; i < placed.length; i++) {
      const id = placed[i];
      if (xById.has(id)) continue;
      const nextId = placed[i + 1];
      const key = nextId !== undefined ? pairKey(id, nextId) : null;
      if (key && mergedPairKeys.has(key)) {
        xById.set(id, cursor);
        xById.set(nextId, cursor);
        mergedPairIds.push([id, nextId]);
        cursor += MERGED_CARD_WIDTH + COL_GAP;
      } else {
        xById.set(id, cursor);
        cursor += COL_STEP;
      }
    }

    // Center each sibling block under its own parents' midpoint, now that
    // the parent generation (processed in an earlier iteration of this
    // same loop, since generations run low-to-high) has its final x. A
    // sibling group whose member is itself part of a merged partner pair is
    // left untouched — dragging a married-in spouse along as the group
    // resizes is more complexity than this pass takes on; that sibling
    // (and their block) simply keeps its original packed position.
    const mergeAnchorOf = new Map<number, number>();
    for (const [a, b] of mergedPairIds) {
      mergeAnchorOf.set(a, a);
      mergeAnchorOf.set(b, a);
    }
    const centerXOf = (id: number): number => {
      const anchor = mergeAnchorOf.get(id);
      if (anchor !== undefined) return xById.get(anchor)! + MERGED_CARD_WIDTH / 2;
      return xById.get(id)! + CARD_WIDTH / 2;
    };
    const widthOf = (id: number): number => (mergeAnchorOf.has(id) ? MERGED_CARD_WIDTH : CARD_WIDTH);

    // If any sibling in a group has their own partner, the whole group is
    // ineligible for centering (not just that one sibling) — otherwise the
    // group would split into a centered fragment and an untouched fragment,
    // scattering siblings who should stay visually together.
    const ineligibleGroupKeys = new Set<string>();
    for (const [key, { children }] of groupKeyToChildren) {
      if (children.some((cid) => mergeAnchorOf.has(cid))) ineligibleGroupKeys.add(key);
    }

    const idsInRow = ids.slice().sort((a, b) => xById.get(a)! - xById.get(b)!);
    type Block = { ids: number[]; groupKey?: string };
    const blocks: Block[] = [];
    for (let i = 0; i < idsInRow.length; ) {
      const id = idsInRow[i];
      const groupKey = childGroupKeyById.get(id);
      const groupEligible = groupKey !== undefined && !ineligibleGroupKeys.has(groupKey);
      if (groupEligible) {
        const runIds = [id];
        let j = i + 1;
        while (j < idsInRow.length && childGroupKeyById.get(idsInRow[j]) === groupKey) {
          runIds.push(idsInRow[j]);
          j++;
        }
        blocks.push({ ids: runIds, groupKey });
        i = j;
      } else if (mergeAnchorOf.has(id)) {
        const anchor = mergeAnchorOf.get(id)!;
        const partnerEntry = mergedPairIds.find(([a]) => a === anchor);
        const blockIds = partnerEntry ? [partnerEntry[0], partnerEntry[1]] : [id];
        blocks.push({ ids: blockIds });
        i += blockIds.length;
      } else {
        blocks.push({ ids: [id] });
        i += 1;
      }
    }

    let prevRightEdge: number | null = null;
    for (const block of blocks) {
      const leftMost = Math.min(...block.ids.map((bid) => xById.get(bid)!));
      const rightMost = Math.max(...block.ids.map((bid) => xById.get(bid)! + widthOf(bid)));
      const blockWidth = rightMost - leftMost;

      let desiredCenter = (leftMost + rightMost) / 2;
      if (block.groupKey) {
        const { parentIds } = groupKeyToChildren.get(block.groupKey)!;
        const parentCenters = parentIds.map(centerXOf);
        desiredCenter = parentCenters.reduce((sum, x) => sum + x, 0) / parentCenters.length;
      }

      const minLeft = prevRightEdge === null ? -Infinity : prevRightEdge + COL_GAP;
      const newLeft = Math.max(desiredCenter - blockWidth / 2, minLeft);
      const shift = newLeft - leftMost;
      if (shift !== 0) {
        for (const bid of block.ids) xById.set(bid, xById.get(bid)! + shift);
      }
      prevRightEdge = newLeft + blockWidth;
    }
  }

  // Centering can push a row's leftmost block into negative x; renormalize
  // the whole layout so nothing sits left of the canvas origin.
  const minX = xById.size > 0 ? Math.min(...xById.values()) : 0;
  if (minX < 0) {
    for (const [id, x] of xById) xById.set(id, x - minX);
  }

  const nodes: PersonNode[] = persons.map((p) => ({
    person: p,
    generation: generation.get(p.id)!,
    x: xById.get(p.id) ?? 0,
    y: generation.get(p.id)! * ROW_STEP,
  }));
  const nodeById = new Map(nodes.map((n) => [n.person.id, n]));

  const mergedPairs: MergedPair[] = mergedPairIds
    .map(([a, b]) => {
      const nodeA = nodeById.get(a);
      const nodeB = nodeById.get(b);
      return nodeA && nodeB ? { a: nodeA, b: nodeB } : null;
    })
    .filter((l): l is MergedPair => l !== null);

  const partnerLinks: PartnerLink[] = [...partnerPairs]
    .filter(([key]) => !mergedPairKeys.has(key))
    .map(([, { a, b }]) => {
      const nodeA = nodeById.get(a);
      const nodeB = nodeById.get(b);
      if (!nodeA || !nodeB || nodeA.generation !== nodeB.generation) return null;
      return nodeA.x <= nodeB.x ? { a: nodeA, b: nodeB } : { a: nodeB, b: nodeA };
    })
    .filter((l): l is PartnerLink => l !== null);

  const parentGroupLinks: ParentGroupLink[] = [...groupKeyToChildren.values()]
    .map(({ parentIds, children }) => {
      const parents = parentIds.map((id) => nodeById.get(id)).filter((n): n is PersonNode => n != null);
      const childNodes = children.map((id) => nodeById.get(id)).filter((n): n is PersonNode => n != null);
      if (parents.length === 0 || childNodes.length === 0) return null;
      return { parents, children: childNodes.sort((a, b) => a.x - b.x) };
    })
    .filter((l): l is ParentGroupLink => l !== null);

  const mergedAnchorIds = new Set(mergedPairIds.map(([a]) => a));
  const rightEdge = (n: PersonNode) => n.x + (mergedAnchorIds.has(n.person.id) ? MERGED_CARD_WIDTH : CARD_WIDTH);
  const maxRight = nodes.length > 0 ? Math.max(...nodes.map(rightEdge)) : CARD_WIDTH;
  const maxY = nodes.length > 0 ? Math.max(...nodes.map((n) => n.y)) : 0;

  return {
    nodes,
    width: maxRight,
    height: maxY + CARD_HEIGHT,
    partnerLinks,
    mergedPairs,
    parentGroupLinks,
  };
}

function addParent(map: Map<number, Set<number>>, childId: number, parentId: number) {
  if (!map.has(childId)) map.set(childId, new Set());
  map.get(childId)!.add(parentId);
}
