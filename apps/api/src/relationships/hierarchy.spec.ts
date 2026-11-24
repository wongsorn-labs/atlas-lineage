import 'reflect-metadata';
import { buildHierarchy, kinshipLabel } from '@wongsorn-labs/atlas-lineage-shared';

const people = [
  { id: 1, name: 'Me', nickname: 'ต้น', gender: 'male' as const },
  { id: 2, name: 'Dad', nickname: null, gender: 'male' as const },
  { id: 3, name: 'Mom', nickname: 'แม่', gender: 'female' as const },
  { id: 4, name: 'Grandpa paternal', nickname: 'ปู่', gender: 'male' as const },
  { id: 5, name: 'Sister', nickname: 'น้อง', gender: 'female' as const },
  { id: 6, name: 'Wife', nickname: 'เอ', gender: 'female' as const },
  { id: 7, name: 'Child', nickname: 'ลูก', gender: 'female' as const },
];

// type = role of personId toward relatedPersonId (A 'parent' B means A is B's parent)
const rels = [
  { personId: 2, relatedPersonId: 1, type: 'parent', side: 'paternal' as const },
  { personId: 3, relatedPersonId: 1, type: 'parent', side: 'maternal' as const },
  { personId: 4, relatedPersonId: 2, type: 'parent', side: null },
  { personId: 2, relatedPersonId: 5, type: 'parent', side: 'paternal' as const },
  { personId: 1, relatedPersonId: 6, type: 'spouse', side: null },
  { personId: 1, relatedPersonId: 7, type: 'parent', side: null },
];

describe('kinshipLabel', () => {
  it('uses gender for parents and children', () => {
    expect(kinshipLabel('parent', 'male', null)).toBe('พ่อ');
    expect(kinshipLabel('parent', 'female', null)).toBe('แม่');
    expect(kinshipLabel('child', 'female', null)).toBe('ลูกสาว');
  });

  it('distinguishes grandparents by family line', () => {
    expect(kinshipLabel('grandparent', 'male', 'paternal')).toBe('ปู่');
    expect(kinshipLabel('grandparent', 'female', 'paternal')).toBe('ย่า');
    expect(kinshipLabel('grandparent', 'male', 'maternal')).toBe('ตา');
    expect(kinshipLabel('grandparent', 'female', 'maternal')).toBe('ยาย');
    expect(kinshipLabel('grandparent', 'male', null)).toBe('ปู่/ตา');
  });
});

describe('buildHierarchy', () => {
  const nodes = buildHierarchy(1, people, rels);
  const byId = new Map(nodes.map((n) => [n.personId, n]));

  it('starts from the chosen root as self', () => {
    expect(nodes[0]).toMatchObject({ personId: 1, role: 'self', generation: 0, label: 'ตัวเอง' });
  });

  it('places parents above and children below', () => {
    expect(byId.get(2)).toMatchObject({ role: 'parent', generation: -1, label: 'พ่อ' });
    expect(byId.get(3)).toMatchObject({ role: 'parent', generation: -1, label: 'แม่' });
    expect(byId.get(7)).toMatchObject({ role: 'child', generation: 1, label: 'ลูกสาว' });
  });

  it('labels grandparents using the parent line', () => {
    expect(byId.get(4)).toMatchObject({ role: 'grandparent', generation: -2, label: 'ปู่' });
  });

  it('labels siblings reached through a shared parent', () => {
    expect(byId.get(5)).toMatchObject({ role: 'sibling', generation: 0, label: 'พี่น้องหญิง' });
  });

  it('labels spouses without changing generation', () => {
    expect(byId.get(6)).toMatchObject({ role: 'spouse', generation: 0, label: 'ภรรยา' });
  });

  it('re-centres on another person and inverts roles', () => {
    const fromDad = buildHierarchy(2, people, rels);
    const me = fromDad.find((n) => n.personId === 1)!;
    expect(me.role).toBe('child');
    expect(me.label).toBe('ลูกชาย');
  });

  it('returns nothing for an unknown root', () => {
    expect(buildHierarchy(999, people, rels)).toEqual([]);
  });
});
