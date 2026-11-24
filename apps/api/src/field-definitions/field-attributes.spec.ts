import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import type { FieldDefinition } from '@wongsorn-labs/atlas-lineage-shared';
import { validateAttributes, filterAttributesForRole } from './field-attributes';

const def = (over: Partial<FieldDefinition>): FieldDefinition => ({
  id: 1, treeId: 1, key: 'x', label: 'X', category: 'general', valueType: 'text',
  visibility: 'members', createdBy: null, createdAt: '', ...over,
});

const defs: FieldDefinition[] = [
  def({ key: 'school', label: 'โรงเรียน', category: 'education' }),
  def({ key: 'graduated_year', label: 'ปีจบ', valueType: 'number' }),
  def({ key: 'met_on', label: 'รู้จักเมื่อ', valueType: 'date' }),
  def({ key: 'phone', label: 'โทร', visibility: 'restricted' }),
];

describe('validateAttributes', () => {
  it('accepts known keys with matching types and coerces numeric strings', () => {
    expect(validateAttributes({ school: 'ม.4', graduated_year: '2550', met_on: '2008-05' }, defs))
      .toEqual({ school: 'ม.4', graduated_year: 2550, met_on: '2008-05' });
  });

  it('rejects unknown keys', () => {
    expect(() => validateAttributes({ favourite_colour: 'red' }, defs)).toThrow(BadRequestException);
  });

  it('rejects a non-numeric value for a number field', () => {
    expect(() => validateAttributes({ graduated_year: 'abc' }, defs)).toThrow(BadRequestException);
  });

  it('rejects a malformed date', () => {
    expect(() => validateAttributes({ met_on: '5 May 2008' }, defs)).toThrow(BadRequestException);
  });

  it('stores empty values as null', () => {
    expect(validateAttributes({ school: '' }, defs)).toEqual({ school: null });
  });
});

describe('filterAttributesForRole', () => {
  const attrs = { school: 'ม.4', phone: '0812345678' };

  it('hides restricted fields from viewers', () => {
    expect(filterAttributesForRole(attrs, defs, 'viewer')).toEqual({ school: 'ม.4' });
  });

  it('shows everything to editors and owners', () => {
    expect(filterAttributesForRole(attrs, defs, 'editor')).toEqual(attrs);
    expect(filterAttributesForRole(attrs, defs, 'owner')).toEqual(attrs);
  });
});
