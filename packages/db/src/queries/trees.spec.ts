import { eq } from 'drizzle-orm';
import { treeMembers, familyTrees } from '../schema';
import { findTreesByUser, updateTree } from './trees';

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

  const returning = jest.fn();
  const updateWhere = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where: updateWhere });
  const update = jest.fn().mockReturnValue({ set });

  return {
    db: { select, update },
    __where: where, __innerJoin: innerJoin, __from: from, __select: select,
    __returning: returning, __updateWhere: updateWhere, __set: set, __update: update,
  };
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

describe('updateTree', () => {
  const clientMock = jest.requireMock('../client') as {
    db: { update: jest.Mock };
    __returning: jest.Mock;
    __updateWhere: jest.Mock;
    __set: jest.Mock;
    __update: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clientMock.__updateWhere.mockReturnValue({ returning: clientMock.__returning });
    clientMock.__set.mockReturnValue({ where: clientMock.__updateWhere });
    clientMock.__update.mockReturnValue({ set: clientMock.__set });
  });

  it('updates only the fields present in the input', async () => {
    const updatedRow = {
      id: 1, name: 'Renamed Tree', description: null, ownerId: 'user-1',
      createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-02'),
    };
    clientMock.__returning.mockResolvedValue([updatedRow]);

    const result = await updateTree(1, { name: 'Renamed Tree' });

    expect(clientMock.__set).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Renamed Tree', updatedAt: expect.any(Date) }),
    );
    expect(clientMock.__set.mock.calls[0][0]).not.toHaveProperty('description');
    expect(eq).toHaveBeenCalledWith(familyTrees.id, 1);
    expect(result).toEqual({
      id: 1,
      name: 'Renamed Tree',
      description: null,
      ownerId: 'user-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    });
  });

  it('returns null when the tree does not exist', async () => {
    clientMock.__returning.mockResolvedValue([]);

    const result = await updateTree(99, { name: 'Ghost Tree' });

    expect(result).toBeNull();
  });
});
