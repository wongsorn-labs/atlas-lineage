import 'reflect-metadata';
import { buildHierarchy } from '@wongsorn-labs/atlas-lineage-shared';

// Family with couples. Root is "me" (id 1, male).
const people = [
  { id: 1, name: 'Me', nickname: 'ต้น', gender: 'male' as const },
  { id: 2, name: 'Dad', nickname: 'พ่อ', gender: 'male' as const },
  { id: 3, name: 'Mom', nickname: 'แม่', gender: 'female' as const },
  { id: 4, name: 'Brother', nickname: 'พี่ชาย', gender: 'male' as const },
  { id: 5, name: 'Brother wife', nickname: 'พี่สะใภ้', gender: 'female' as const },
  { id: 6, name: 'Sister', nickname: 'น้องสาว', gender: 'female' as const },
  { id: 7, name: 'Sister partner', nickname: 'แฟนน้องสาว', gender: 'male' as const },
  { id: 8, name: 'My partner', nickname: 'แฟนผม', gender: 'female' as const },
  { id: 9, name: 'Partner father', nickname: 'พ่อแฟน', gender: 'male' as const },
  { id: 10, name: 'Partner mother', nickname: 'แม่แฟน', gender: 'female' as const },
  { id: 11, name: 'Brother-in-law parent', nickname: 'พ่อผัวพี่', gender: 'male' as const },
];

const rels = [
  // Parents are a couple (Dad is Mom's spouse), both are my parents.
  { personId: 2, relatedPersonId: 1, type: 'parent', side: 'paternal' as const },
  { personId: 3, relatedPersonId: 1, type: 'parent', side: 'maternal' as const },
  { personId: 2, relatedPersonId: 3, type: 'spouse', side: null },
  // Siblings: both parents are parents of brother and sister.
  { personId: 2, relatedPersonId: 4, type: 'parent', side: 'paternal' as const },
  { personId: 3, relatedPersonId: 4, type: 'parent', side: 'maternal' as const },
  { personId: 2, relatedPersonId: 6, type: 'parent', side: 'paternal' as const },
  { personId: 3, relatedPersonId: 6, type: 'parent', side: 'maternal' as const },
  // Brother is married to brother's wife; sister is with a partner.
  { personId: 4, relatedPersonId: 5, type: 'spouse', side: null },
  { personId: 6, relatedPersonId: 7, type: 'partner', side: null },
  // Me and my partner.
  { personId: 1, relatedPersonId: 8, type: 'partner', side: null },
  // My partner's parents.
  { personId: 9, relatedPersonId: 8, type: 'parent', side: null },
  { personId: 10, relatedPersonId: 8, type: 'parent', side: null },
  // Brother's wife's parent (in-law of brother, not of me) is not reachable within range from me.
  { personId: 11, relatedPersonId: 5, type: 'parent', side: null },
];

const byId = (nodes: ReturnType<typeof buildHierarchy>) => new Map(nodes.map((n) => [n.personId, n]));

describe('couples from my point of view', () => {
  const nodes = buildHierarchy(1, people, rels);
  const m = byId(nodes);

  it('parents appear once each as พ่อ and แม่, even though they are a couple', () => {
    expect(m.get(2)).toMatchObject({ role: 'parent', label: 'พ่อ', generation: -1 });
    expect(m.get(3)).toMatchObject({ role: 'parent', label: 'แม่', generation: -1 });
    expect(nodes.filter((n) => n.personId === 2 || n.personId === 3)).toHaveLength(2);
  });

  it('brother and sister are siblings with their own gender labels', () => {
    expect(m.get(4)).toMatchObject({ role: 'sibling', label: 'พี่น้องชาย', generation: 0 });
    expect(m.get(6)).toMatchObject({ role: 'sibling', label: 'พี่น้องหญิง', generation: 0 });
  });

  it('brother\'s wife is a sibling-in-law, not an unknown relative', () => {
    expect(m.get(5)).toMatchObject({ role: 'sibling_spouse', label: 'สะใภ้', generation: 0 });
  });

  it('sister\'s partner is labelled as her partner', () => {
    expect(m.get(7)).toMatchObject({ role: 'sibling_partner', label: 'แฟนของพี่น้อง', generation: 0 });
  });

  it('my partner is แฟน at the same generation', () => {
    expect(m.get(8)).toMatchObject({ role: 'partner', label: 'แฟน', generation: 0 });
  });

  it('my partner\'s parents are in-law parents of a female partner', () => {
    expect(m.get(9)).toMatchObject({ role: 'partner_parent', label: 'พ่อของแฟน', generation: -1 });
    expect(m.get(10)).toMatchObject({ role: 'partner_parent', label: 'แม่ของแฟน', generation: -1 });
  });

  it('a brother-in-law parent is not shown from my side (no path within range)', () => {
    expect(m.has(11)).toBe(false);
  });
});

describe('couples re-centred on a partner', () => {
  it('from my partner, I am her partner and her parents are her parents', () => {
    const m = byId(buildHierarchy(8, people, rels));
    expect(m.get(1)).toMatchObject({ role: 'partner', label: 'แฟน' });
    expect(m.get(9)).toMatchObject({ role: 'parent', label: 'พ่อ' });
    expect(m.get(10)).toMatchObject({ role: 'parent', label: 'แม่' });
  });

  it('from my father, my mother is his spouse (ภรรยา)', () => {
    const m = byId(buildHierarchy(2, people, rels));
    expect(m.get(3)).toMatchObject({ role: 'spouse', label: 'ภรรยา' });
  });
});

describe('in-law labels by the spouse\'s gender', () => {
  const { kinshipLabel } = jest.requireActual('@wongsorn-labs/atlas-lineage-shared');
  it('wife\'s parents are พ่อตา / แม่ยาย', () => {
    expect(kinshipLabel('in_law_parent', 'male', null, 'female')).toBe('พ่อตา');
    expect(kinshipLabel('in_law_parent', 'female', null, 'female')).toBe('แม่ยาย');
  });
  it('husband\'s parents are พ่อผัว / แม่ผัว', () => {
    expect(kinshipLabel('in_law_parent', 'male', null, 'male')).toBe('พ่อผัว');
    expect(kinshipLabel('in_law_parent', 'female', null, 'male')).toBe('แม่ผัว');
  });
});
