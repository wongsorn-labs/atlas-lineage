import { eq, or } from 'drizzle-orm';
import { relationships } from '../schema';
import { findRelationshipsByPerson } from './relationships';

const mockRows = [
  { id: 1, personId: 1, relatedPersonId: 2, type: 'parent', createdAt: new Date('2024-01-01') },
  { id: 2, personId: 3, relatedPersonId: 1, type: 'sibling', createdAt: new Date('2024-01-01') },
];

jest.mock('../client', () => {
  const where = jest.fn();
  const from = jest.fn().mockReturnValue({ where });
  const select = jest.fn().mockReturnValue({ from });
  return { db: { select }, __where: where, __from: from, __select: select };
});

jest.mock('drizzle-orm', () => {
  const actual = jest.requireActual('drizzle-orm');
  return {
    ...actual,
    eq: jest.fn((column, value) => ({ column, value })),
    or: jest.fn((...conditions) => ({ conditions })),
  };
});

describe('relationship queries', () => {
  const clientMock = jest.requireMock('../client') as {
    db: { select: jest.Mock };
    __where: jest.Mock;
    __from: jest.Mock;
    __select: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clientMock.__where.mockResolvedValue(mockRows);
    clientMock.__from.mockReturnValue({ where: clientMock.__where });
    clientMock.__select.mockReturnValue({ from: clientMock.__from });
  });

  it('finds relationships where the person is on either side', async () => {
    const result = await findRelationshipsByPerson(1);

    expect(eq).toHaveBeenCalledWith(relationships.personId, 1);
    expect(eq).toHaveBeenCalledWith(relationships.relatedPersonId, 1);
    expect(or).toHaveBeenCalledWith(
      { column: relationships.personId, value: 1 },
      { column: relationships.relatedPersonId, value: 1 },
    );
    expect(result).toEqual([
      { id: 1, personId: 1, relatedPersonId: 2, type: 'parent', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 2, personId: 3, relatedPersonId: 1, type: 'sibling', createdAt: '2024-01-01T00:00:00.000Z' },
    ]);
  });
});
