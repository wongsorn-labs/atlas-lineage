import { BadRequestException } from '@nestjs/common';
import type { FieldDefinition, PersonAttributes } from '@wongsorn-labs/atlas-lineage-shared';

const PARTIAL_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/**
 * Checks attribute values against the tree's field definitions.
 * Unknown keys are rejected so a typo never silently creates data nobody can see.
 */
export function validateAttributes(attrs: PersonAttributes | undefined, defs: FieldDefinition[]): PersonAttributes {
  if (!attrs) return {};
  const byKey = new Map(defs.map((d) => [d.key, d]));
  for (const [key, value] of Object.entries(attrs)) {
    const def = byKey.get(key);
    if (!def) throw new BadRequestException(`Unknown field "${key}"`);
    if (value === null || value === '') {
      attrs[key] = null;
      continue;
    }
    if (def.valueType === 'number') {
      const n = typeof value === 'string' ? Number(value) : value;
      if (typeof n !== 'number' || !Number.isFinite(n)) throw new BadRequestException(`"${def.label}" must be a number`);
      attrs[key] = n;
    } else if (def.valueType === 'date') {
      if (typeof value !== 'string' || !PARTIAL_DATE.test(value)) {
        throw new BadRequestException(`"${def.label}" must look like YYYY, YYYY-MM or YYYY-MM-DD`);
      }
    } else if (typeof value !== 'string') {
      throw new BadRequestException(`"${def.label}" must be text`);
    }
  }
  return attrs;
}

/** Drops values the viewer's role is not allowed to see (restricted fields for viewers). */
export function filterAttributesForRole(
  attrs: PersonAttributes,
  defs: FieldDefinition[],
  role: 'owner' | 'editor' | 'viewer' | undefined,
): PersonAttributes {
  if (role !== 'viewer') return attrs;
  const restricted = new Set(defs.filter((d) => d.visibility === 'restricted').map((d) => d.key));
  return Object.fromEntries(Object.entries(attrs).filter(([k]) => !restricted.has(k)));
}
