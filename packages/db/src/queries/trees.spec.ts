import { eq } from 'drizzle-orm';
import { treeMembers } from '../schema';
import { findTreesByUser } from './trees';

const mockRows = [
  {
    tree: {
      id: 1,
      name: 'Default Tree',
      description: null,
      ownerId: 'user-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    role: 'owner',
  },
];

jest.mock('../client', () => {
  const where = jest.fn();
  const innerJoin = jest.fn().mockReturnValue({ where });
  const from = jest.fn().mockReturnValue({ innerJoin });
  const select = jest.fn().mockReturnValue({ from });
  return { db: { select }, __where: where, __innerJoin: innerJoin, __from: from, __select: select };
});

jest.mock('drizzle-orm', () => {
  const actual = jest.requireActual('drizzle-orm');
  return {
    ...actual,
    eq: jest.fn((column, value) => ({ column, value })),
  };
});

describe('findTreesByUser', () => {
  const clientMock = jest.requireMock('../client') as {
    db: { select: jest.Mock };
    __where: jest.Mock;
    __innerJoin: jest.Mock;
    __from: jest.Mock;
    __select: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clientMock.__where.mockResolvedValue(mockRows);
    clientMock.__innerJoin.mockReturnValue({ where: clientMock.__where });
    clientMock.__from.mockReturnValue({ innerJoin: clientMock.__innerJoin });
    clientMock.__select.mockReturnValue({ from: clientMock.__from });
  });

  it('returns each tree with the caller\'s role in it', async () => {
    const result = await findTreesByUser('user-1');

    expect(eq).toHaveBeenCalledWith(treeMembers.userId, 'user-1');
    expect(result).toEqual([
      {
        id: 1,
        name: 'Default Tree',
        description: null,
        ownerId: 'user-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        role: 'owner',
      },
    ]);
  });
});
