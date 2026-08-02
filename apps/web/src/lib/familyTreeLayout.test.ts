import { describe, it, expect } from 'vitest';
import { computeFamilyTreeLayout, CARD_WIDTH, MERGED_CARD_WIDTH } from './familyTreeLayout';
import type { Person, Relationship } from '@wongsorn-labs/atlas-lineage-shared';

let nextRelId = 1;

function makePerson(id: number, name: string, birthYear: number | null = null): Person {
  return {
    id, name, treeId: 1, birthYear, deathYear: null,
    birthLat: null, birthLng: null, birthPlace: null, notes: null,
    createdAt: '', updatedAt: '',
  };
}

function rel(personId: number, relatedPersonId: number, type: Relationship['type']): Relationship {
  return { id: nextRelId++, treeId: 1, personId, relatedPersonId, type, createdAt: '' };
}

describe('computeFamilyTreeLayout', () => {
  it('places an isolated person at generation 0', () => {
    const { nodes } = computeFamilyTreeLayout([makePerson(1, 'Solo')], []);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].generation).toBe(0);
  });

  it('puts a child one generation below its parent, linked by a parent group', () => {
    const persons = [makePerson(1, 'Parent'), makePerson(2, 'Child')];
    const relationships = [rel(1, 2, 'parent')];
    const { nodes, parentGroupLinks } = computeFamilyTreeLayout(persons, relationships);

    const parentNode = nodes.find((n) => n.person.id === 1)!;
    const childNode = nodes.find((n) => n.person.id === 2)!;
    expect(parentNode.generation).toBe(0);
    expect(childNode.generation).toBe(1);

    expect(parentGroupLinks).toHaveLength(1);
    expect(parentGroupLinks[0].parents.map((n) => n.person.id)).toEqual([1]);
    expect(parentGroupLinks[0].children.map((n) => n.person.id)).toEqual([2]);
  });

  it('resolves the same relationship recorded as "child" from the other side identically', () => {
    const persons = [makePerson(1, 'Parent'), makePerson(2, 'Child')];
    const relationships = [rel(2, 1, 'child')];
    const { nodes } = computeFamilyTreeLayout(persons, relationships);

    expect(nodes.find((n) => n.person.id === 1)!.generation).toBe(0);
    expect(nodes.find((n) => n.person.id === 2)!.generation).toBe(1);
  });

  it('merges a single partner pair into one fused card instead of a connector line', () => {
    const persons = [makePerson(1, 'A'), makePerson(2, 'B')];
    const relationships = [rel(1, 2, 'spouse')];
    const { nodes, partnerLinks, mergedPairs } = computeFamilyTreeLayout(persons, relationships);

    const a = nodes.find((n) => n.person.id === 1)!;
    const b = nodes.find((n) => n.person.id === 2)!;
    expect(a.generation).toBe(b.generation);
    expect(a.x).toBe(b.x);
    expect(partnerLinks).toHaveLength(0);
    expect(mergedPairs).toHaveLength(1);
    expect(mergedPairs[0].a.person.id).toBe(1);
    expect(mergedPairs[0].b.person.id).toBe(2);
  });

  it('pulls a spouse who married in (no recorded parents) onto their partner\'s generation', () => {
    const persons = [makePerson(1, 'Grandparent'), makePerson(2, 'Parent'), makePerson(3, 'MarriedIn')];
    const relationships = [rel(1, 2, 'parent'), rel(2, 3, 'spouse')];
    const { nodes } = computeFamilyTreeLayout(persons, relationships);

    const parent = nodes.find((n) => n.person.id === 2)!;
    const marriedIn = nodes.find((n) => n.person.id === 3)!;
    expect(marriedIn.generation).toBe(parent.generation);
  });

  it('groups full siblings under one two-parent link', () => {
    const persons = [makePerson(1, 'Mom'), makePerson(2, 'Dad'), makePerson(3, 'Kid1'), makePerson(4, 'Kid2')];
    const relationships = [
      rel(1, 2, 'spouse'),
      rel(1, 3, 'parent'),
      rel(2, 3, 'parent'),
      rel(1, 4, 'parent'),
      rel(2, 4, 'parent'),
    ];
    const { parentGroupLinks } = computeFamilyTreeLayout(persons, relationships);

    expect(parentGroupLinks).toHaveLength(1);
    expect(parentGroupLinks[0].parents.map((n) => n.person.id).sort()).toEqual([1, 2]);
    expect(parentGroupLinks[0].children.map((n) => n.person.id).sort()).toEqual([3, 4]);
  });

  it('only merges the first recorded partner relationship; a second partner falls back to a connector', () => {
    const persons = [makePerson(1, 'A'), makePerson(2, 'B'), makePerson(3, 'C')];
    const relationships = [rel(1, 2, 'spouse'), rel(1, 3, 'partner')];
    const { mergedPairs, partnerLinks } = computeFamilyTreeLayout(persons, relationships);

    expect(mergedPairs).toHaveLength(1);
    expect([mergedPairs[0].a.person.id, mergedPairs[0].b.person.id].sort()).toEqual([1, 2]);
    expect(partnerLinks).toHaveLength(1);
    expect([partnerLinks[0].a.person.id, partnerLinks[0].b.person.id].sort()).toEqual([1, 3]);
  });

  it('does not merge a pair when each side\'s lowest-id partner relationship points elsewhere', () => {
    // B's lowest-id partner is C (rel id 1), not A — so A-B (rel id 2) can't merge either.
    const persons = [makePerson(1, 'A'), makePerson(2, 'B'), makePerson(3, 'C')];
    const relationships = [rel(2, 3, 'spouse'), rel(1, 2, 'spouse')];
    const { mergedPairs, partnerLinks } = computeFamilyTreeLayout(persons, relationships);

    expect(mergedPairs).toHaveLength(1);
    expect([mergedPairs[0].a.person.id, mergedPairs[0].b.person.id].sort()).toEqual([2, 3]);
    expect(partnerLinks.some((l) => [l.a.person.id, l.b.person.id].sort().join(',') === '1,2')).toBe(true);
  });

  it('anchors a parent-to-children drop line at the merged couple\'s fused center, not either partner\'s own x', () => {
    const persons = [makePerson(1, 'Mom'), makePerson(2, 'Dad'), makePerson(3, 'Kid')];
    const relationships = [rel(1, 2, 'spouse'), rel(1, 3, 'parent'), rel(2, 3, 'parent')];
    const { mergedPairs, parentGroupLinks } = computeFamilyTreeLayout(persons, relationships);

    expect(mergedPairs).toHaveLength(1);
    expect(parentGroupLinks).toHaveLength(1);
    expect(parentGroupLinks[0].parents.map((n) => n.person.id).sort()).toEqual([1, 2]);
    // Both merged parents share one x — the group link's own rendering (FamilyChart)
    // is responsible for widening to the fused center; here we just confirm the
    // layout gives both parents the identical x a fused card needs.
    const [mom, dad] = parentGroupLinks[0].parents;
    expect(mom.x).toBe(dad.x);
  });

  it('orders siblings left-to-right by birth year, oldest first', () => {
    const persons = [
      makePerson(1, 'Mom'), makePerson(2, 'Dad'),
      // Deliberately created out of birth order to prove sort order isn't just id/insertion order.
      makePerson(3, 'Youngest', 1995), makePerson(4, 'Eldest', 1985), makePerson(5, 'Middle', 1990),
    ];
    const relationships = [
      rel(1, 2, 'spouse'),
      rel(1, 3, 'parent'), rel(2, 3, 'parent'),
      rel(1, 4, 'parent'), rel(2, 4, 'parent'),
      rel(1, 5, 'parent'), rel(2, 5, 'parent'),
    ];
    const { parentGroupLinks } = computeFamilyTreeLayout(persons, relationships);

    expect(parentGroupLinks).toHaveLength(1);
    expect(parentGroupLinks[0].children.map((n) => n.person.id)).toEqual([4, 5, 3]);
  });

  it('sorts a sibling with an unknown birth year after known-birth-year siblings', () => {
    const persons = [
      makePerson(1, 'Mom'), makePerson(2, 'Dad'),
      makePerson(3, 'Unknown', null), makePerson(4, 'Known', 1990),
    ];
    const relationships = [
      rel(1, 2, 'spouse'),
      rel(1, 3, 'parent'), rel(2, 3, 'parent'),
      rel(1, 4, 'parent'), rel(2, 4, 'parent'),
    ];
    const { parentGroupLinks } = computeFamilyTreeLayout(persons, relationships);

    expect(parentGroupLinks[0].children.map((n) => n.person.id)).toEqual([4, 3]);
  });

  it('centers an only child under its two (merged) parents', () => {
    const persons = [makePerson(1, 'Mom'), makePerson(2, 'Dad'), makePerson(3, 'Kid')];
    const relationships = [rel(1, 2, 'spouse'), rel(1, 3, 'parent'), rel(2, 3, 'parent')];
    const { mergedPairs, nodes } = computeFamilyTreeLayout(persons, relationships);

    const parentCenter = mergedPairs[0].a.x + MERGED_CARD_WIDTH / 2;
    const kid = nodes.find((n) => n.person.id === 3)!;
    expect(kid.x + CARD_WIDTH / 2).toBeCloseTo(parentCenter, 5);
  });

  it('centers an only child under two parents who have no recorded relationship to each other', () => {
    // No spouse/partner row between Mom and Dad at all -- two independent
    // single cards, not a merged pair -- centering should still work off
    // their individual (unmerged) positions.
    const persons = [makePerson(1, 'Mom'), makePerson(2, 'Dad'), makePerson(3, 'Kid')];
    const relationships = [rel(1, 3, 'parent'), rel(2, 3, 'parent')];
    const { nodes, mergedPairs } = computeFamilyTreeLayout(persons, relationships);

    expect(mergedPairs).toHaveLength(0);
    const mom = nodes.find((n) => n.person.id === 1)!;
    const dad = nodes.find((n) => n.person.id === 2)!;
    const kid = nodes.find((n) => n.person.id === 3)!;
    const parentCenter = (mom.x + CARD_WIDTH / 2 + dad.x + CARD_WIDTH / 2) / 2;
    expect(kid.x + CARD_WIDTH / 2).toBeCloseTo(parentCenter, 5);
  });

  it('centers a multi-child sibling block as one unit under merged parents, preserving sibling spacing', () => {
    const persons = [
      makePerson(1, 'Mom'), makePerson(2, 'Dad'),
      makePerson(3, 'Kid1', 1985), makePerson(4, 'Kid2', 1988), makePerson(5, 'Kid3', 1990),
    ];
    const relationships = [
      rel(1, 2, 'spouse'),
      rel(1, 3, 'parent'), rel(2, 3, 'parent'),
      rel(1, 4, 'parent'), rel(2, 4, 'parent'),
      rel(1, 5, 'parent'), rel(2, 5, 'parent'),
    ];
    const { mergedPairs, parentGroupLinks } = computeFamilyTreeLayout(persons, relationships);

    const parentCenter = mergedPairs[0].a.x + MERGED_CARD_WIDTH / 2;
    const children = parentGroupLinks[0].children;
    const blockLeft = Math.min(...children.map((c) => c.x));
    const blockRight = Math.max(...children.map((c) => c.x)) + CARD_WIDTH;
    expect((blockLeft + blockRight) / 2).toBeCloseTo(parentCenter, 5);

    // Siblings stay evenly spaced by the normal column step, just shifted as a block.
    expect(children[1].x - children[0].x).toBeCloseTo(CARD_WIDTH + 32, 5);
    expect(children[2].x - children[1].x).toBeCloseTo(CARD_WIDTH + 32, 5);
  });

  it('does not overlap a neighboring family when centering pushes into it', () => {
    // Two unrelated couples on the same generation, each with one child close
    // together -- centering must not make the two families collide.
    const persons = [
      makePerson(1, 'MomA'), makePerson(2, 'DadA'), makePerson(3, 'KidA'),
      makePerson(4, 'MomB'), makePerson(5, 'DadB'), makePerson(6, 'KidB'),
    ];
    const relationships = [
      rel(1, 2, 'spouse'), rel(1, 3, 'parent'), rel(2, 3, 'parent'),
      rel(4, 5, 'spouse'), rel(4, 6, 'parent'), rel(5, 6, 'parent'),
    ];
    const { nodes, mergedPairs } = computeFamilyTreeLayout(persons, relationships);

    expect(mergedPairs).toHaveLength(2);
    const sorted = [...mergedPairs].sort((a, b) => a.a.x - b.a.x);
    // The second couple's card must start at least COL_GAP after the first couple's card ends.
    expect(sorted[1].a.x).toBeGreaterThanOrEqual(sorted[0].a.x + MERGED_CARD_WIDTH + 32);

    // No two nodes anywhere in the row occupy overlapping x ranges.
    const row = nodes.filter((n) => n.generation === nodes.find((x) => x.person.id === 3)!.generation);
    const spans = row
      .map((n) => {
        const isMergedAnchor = mergedPairs.some((p) => p.a.person.id === n.person.id);
        return { left: n.x, right: n.x + (isMergedAnchor ? MERGED_CARD_WIDTH : CARD_WIDTH) };
      })
      .sort((a, b) => a.left - b.left);
    for (let i = 1; i < spans.length; i++) {
      expect(spans[i].left).toBeGreaterThanOrEqual(spans[i - 1].right);
    }
  });

  it('leaves a sibling group untouched when one sibling has their own partner', () => {
    const persons = [
      makePerson(1, 'Mom'), makePerson(2, 'Dad'),
      makePerson(3, 'Kid1', 1985), makePerson(4, 'Kid1Spouse'), makePerson(5, 'Kid2', 1990),
    ];
    const relationships = [
      rel(1, 2, 'spouse'),
      rel(1, 3, 'parent'), rel(2, 3, 'parent'),
      rel(1, 5, 'parent'), rel(2, 5, 'parent'),
      rel(3, 4, 'spouse'),
    ];
    // Should not throw, and Kid1's merge with their own spouse must survive untouched.
    const { mergedPairs } = computeFamilyTreeLayout(persons, relationships);
    const kid1Pair = mergedPairs.find((p) => p.a.person.id === 3 || p.b.person.id === 3);
    expect(kid1Pair).toBeDefined();
    expect([kid1Pair!.a.person.id, kid1Pair!.b.person.id].sort()).toEqual([3, 4]);
  });

  it('does not infinite-loop on a cyclical (invalid) parent relationship', () => {
    const persons = [makePerson(1, 'A'), makePerson(2, 'B')];
    const relationships = [rel(1, 2, 'parent'), rel(2, 1, 'parent')];
    const { nodes } = computeFamilyTreeLayout(persons, relationships);
    expect(nodes).toHaveLength(2);
    for (const node of nodes) {
      expect(Number.isFinite(node.generation)).toBe(true);
    }
  });

  it('ignores relationships referencing a person outside the given list', () => {
    const persons = [makePerson(1, 'Only')];
    const relationships = [rel(1, 999, 'parent')];
    const { nodes, parentGroupLinks } = computeFamilyTreeLayout(persons, relationships);
    expect(nodes).toHaveLength(1);
    expect(parentGroupLinks).toHaveLength(0);
  });
});
