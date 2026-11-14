import { describe, it, expect } from 'vitest';
import { parseNicknames } from './PersonForm';

describe('parseNicknames', () => {
  it('splits on commas, trims, and drops empty entries', () => {
    expect(parseNicknames(' Tom, Tommy ,, ')).toEqual(['Tom', 'Tommy']);
  });

  it('returns an empty list for missing or blank input', () => {
    expect(parseNicknames(undefined)).toEqual([]);
    expect(parseNicknames('   ')).toEqual([]);
  });
});
