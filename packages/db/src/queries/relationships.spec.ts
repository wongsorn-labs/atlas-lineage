import { eq, or } from 'drizzle-orm';
import { relationships } from '../schema';
import { findRelationshipsByPerson } from './relationships';

jest.mock('../client', () => ({
  __mocks: {
    all: jest.fn(),
    where: jest.fn(),
    from: jest.fn(),
    select: jest.fn(),
  },
  get db() {
    const mocks = jest.requireMock('../client').__mocks;
    mocks.where.mockImplementation(() => ({ all: mocks.all }));
    mocks.from.mockImplementation(() => ({ where: mocks.where }));
    mocks.select.mockImplementation(() => ({ from: mocks.from }));
    return { select: mocks.select };
  },
}));

jest.mock('drizzle-orm', () => {
  const actual = jest.requireActual('drizzle-orm');
  return {
    ...actual,
    eq: jest.fn((column, value) => ({ column, value })),
    or: jest.fn((...conditions) => ({ conditions })),
  };
});

describe('relationship queries', () => {
  const dbMocks = jest.requireMock('../client').__mocks as {
    all: jest.Mock;
    where: jest.Mock;
    from: jest.Mock;
    select: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dbMocks.all.mockReturnValue([
      { id: 1, personId: 1, relatedPersonId: 2, type: 'parent', createdAt: 'now' },
      { id: 2, personId: 3, relatedPersonId: 1, type: 'sibling', createdAt: 'now' },
    ]);
  });

  it('finds relationships where the person is on either side', () => {
    const result = findRelationshipsByPerson(1);

    expect(eq).toHaveBeenCalledWith(relationships.personId, 1);
    expect(eq).toHaveBeenCalledWith(relationships.relatedPersonId, 1);
    expect(or).toHaveBeenCalledWith(
      { column: relationships.personId, value: 1 },
      { column: relationships.relatedPersonId, value: 1 },
    );
    expect(result).toEqual([
      { id: 1, personId: 1, relatedPersonId: 2, type: 'parent', createdAt: 'now' },
      { id: 2, personId: 3, relatedPersonId: 1, type: 'sibling', createdAt: 'now' },
    ]);
  });
});
