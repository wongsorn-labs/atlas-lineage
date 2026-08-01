import { eq } from 'drizzle-orm';
import { treeMembers, familyTrees } from '../schema';
import {
  findTreesByUser, updateTree, softDeleteTree, restoreTree, purgeTree,
  findTrashedTreesByOwner, createPersonalTreeIfNeeded, setPrimaryTree,
} from './trees';

/**
 * A generic thenable chain mock: every property access returns a function
 * that records the call and returns the same chain, so `db.update(...).set(...).where(...)`
 * (or any other combination) all resolve through one shared FIFO queue —
 * matching how these multi-step query functions await sequentially, not concurrently.
 */
function createChainableDb() {
  const resultsQueue: unknown[] = [];

  const chain: unknown = new Proxy(() => {}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(resultsQueue.shift());
      }
      return () => chain;
    },
  });

  const db = new Proxy({}, {
    get() {
      return () => chain;
    },
  });

  return { db, resultsQueue };
}

let chainableDb = createChainableDb();

jest.mock('../client', () => ({
  get db() {
    return chainableDb.db;
  },
}));

jest.mock('drizzle-orm', () => {
  const actual = jest.requireActual('drizzle-orm');
  return {
    ...actual,
    eq: jest.fn((column, value) => ({ column, value })),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  chainableDb = createChainableDb();
});

const treeRow = {
  id: 1, name: 'Default Tree', description: null, ownerId: 'user-1', deletedAt: null,
  createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
};
const profileRow = {
  id: 'user-1', email: 'a@example.com', displayName: null, avatarUrl: null,
  defaultCountry: null, primaryTreeId: null, createdAt: new Date('2024-01-01'),
};

describe('findTreesByUser', () => {
  it('returns each tree with the caller\'s role in it', async () => {
    chainableDb.resultsQueue.push([{ tree: treeRow, role: 'owner' }]);

    const result = await findTreesByUser('user-1');

    expect(eq).toHaveBeenCalledWith(treeMembers.userId, 'user-1');
    expect(result).toEqual([{
      id: 1, name: 'Default Tree', description: null, ownerId: 'user-1', deletedAt: null,
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', role: 'owner',
    }]);
  });
});

describe('updateTree', () => {
  it('updates only the fields present in the input', async () => {
    chainableDb.resultsQueue.push([{ ...treeRow, name: 'Renamed Tree', updatedAt: new Date('2024-01-02') }]);

    const result = await updateTree(1, { name: 'Renamed Tree' });

    expect(eq).toHaveBeenCalledWith(familyTrees.id, 1);
    expect(result?.name).toBe('Renamed Tree');
  });

  it('returns null when the tree does not exist', async () => {
    chainableDb.resultsQueue.push([]);

    const result = await updateTree(99, { name: 'Ghost Tree' });

    expect(result).toBeNull();
  });
});

describe('softDeleteTree', () => {
  it('soft-deletes the tree and clears it as primary for every member who had it set', async () => {
    chainableDb.resultsQueue.push([{ role: 'owner' }], [{ ...treeRow, deletedAt: new Date('2024-06-01') }], undefined);

    const result = await softDeleteTree(1, 'user-1');

    expect(result?.deletedAt).toBe('2024-06-01T00:00:00.000Z');
  });

  it('returns null when the caller is not the owner', async () => {
    chainableDb.resultsQueue.push([{ role: 'editor' }]);

    const result = await softDeleteTree(1, 'user-2');

    expect(result).toBeNull();
  });

  it('returns null for an already soft-deleted (or non-member) tree', async () => {
    // findMemberRole itself excludes soft-deleted trees, so it resolves empty.
    chainableDb.resultsQueue.push([]);

    const result = await softDeleteTree(1, 'user-1');

    expect(result).toBeNull();
  });
});

describe('restoreTree', () => {
  it('restores a soft-deleted tree owned by the caller', async () => {
    chainableDb.resultsQueue.push([{ ...treeRow, deletedAt: null }]);

    const result = await restoreTree(1, 'user-1');

    expect(result?.id).toBe(1);
  });

  it('returns null when the tree is not soft-deleted, missing, or not owned by the caller', async () => {
    chainableDb.resultsQueue.push([]);

    const result = await restoreTree(1, 'user-2');

    expect(result).toBeNull();
  });
});

describe('purgeTree', () => {
  it('permanently deletes a soft-deleted tree owned by the caller', async () => {
    chainableDb.resultsQueue.push([treeRow]);

    const result = await purgeTree(1, 'user-1');

    expect(result).toBe(true);
  });

  it('returns false when the tree is not soft-deleted, missing, or not owned by the caller', async () => {
    chainableDb.resultsQueue.push([]);

    const result = await purgeTree(1, 'user-2');

    expect(result).toBe(false);
  });
});

describe('findTrashedTreesByOwner', () => {
  it('returns soft-deleted trees owned by the caller', async () => {
    chainableDb.resultsQueue.push([{ ...treeRow, deletedAt: new Date('2024-06-01') }]);

    const result = await findTrashedTreesByOwner('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].deletedAt).toBe('2024-06-01T00:00:00.000Z');
  });
});

describe('createPersonalTreeIfNeeded', () => {
  it('is a no-op for a user who already has a tree membership', async () => {
    chainableDb.resultsQueue.push([{ id: 1 }]);

    await createPersonalTreeIfNeeded('user-1');

    expect(chainableDb.resultsQueue).toHaveLength(0);
  });

  it('creates a personal tree and sets it primary for a zero-membership user', async () => {
    chainableDb.resultsQueue.push([], [treeRow], undefined, undefined);

    await createPersonalTreeIfNeeded('user-1');

    expect(chainableDb.resultsQueue).toHaveLength(0);
  });
});

describe('setPrimaryTree', () => {
  it('clears the primary tree when treeId is null, without a membership check', async () => {
    chainableDb.resultsQueue.push([profileRow]);

    const result = await setPrimaryTree('user-1', null);

    expect(result).not.toBeNull();
  });

  it('sets the primary tree when the caller is a member', async () => {
    chainableDb.resultsQueue.push([{ role: 'viewer' }], [{ ...profileRow, primaryTreeId: 1 }]);

    const result = await setPrimaryTree('user-1', 1);

    expect(result?.primaryTreeId).toBe(1);
  });

  it('returns null when the caller is not a member of the target tree', async () => {
    chainableDb.resultsQueue.push([]);

    const result = await setPrimaryTree('user-1', 1);

    expect(result).toBeNull();
  });
});
