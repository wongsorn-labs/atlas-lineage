import { describe, it, expect } from 'vitest';
import { computeFamilyTreeLayout } from './familyTreeLayout';
import type { Person, Relationship } from '@wongsorn-labs/atlas-lineage-shared';

let nextRelId = 1;

function makePerson(id: number, name: string): Person {
  return {
    id, name, treeId: 1, birthYear: null, deathYear: null,
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

  it('keeps partners on the same generation and adjacent', () => {
    const persons = [makePerson(1, 'A'), makePerson(2, 'B')];
    const relationships = [rel(1, 2, 'spouse')];
    const { nodes, partnerLinks } = computeFamilyTreeLayout(persons, relationships);

    const a = nodes.find((n) => n.person.id === 1)!;
    const b = nodes.find((n) => n.person.id === 2)!;
    expect(a.generation).toBe(b.generation);
    expect(Math.abs(a.x - b.x)).toBeGreaterThan(0);
    expect(partnerLinks).toHaveLength(1);
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
