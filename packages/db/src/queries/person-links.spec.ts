import {
  requestPersonLink, approvePersonLink, rejectPersonLink, unlinkPersonTree,
  getPersonOriginTreeId, findApprovedLinkedPersonIds,
} from './person-links';

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

  const db = new Proxy({}, { get() { return () => chain; } });
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
  return { ...actual, eq: jest.fn((column, value) => ({ column, value })) };
});

beforeEach(() => {
  chainableDb = createChainableDb();
});

const linkRow = {
  id: 10, personId: 5, treeId: 2, status: 'pending' as const,
  requestedBy: 'user-2', createdAt: new Date('2024-01-01'), decidedAt: null,
};

describe('requestPersonLink', () => {
  it('rejects a person that does not exist', async () => {
    chainableDb.resultsQueue.push([]);

    const result = await requestPersonLink(5, 2, 'user-2');

    expect(result).toEqual({ ok: false, reason: 'person_not_found' });
  });

  it('rejects linking a person into their own origin tree', async () => {
    chainableDb.resultsQueue.push([{ id: 5, treeId: 2 }]);

    const result = await requestPersonLink(5, 2, 'user-2');

    expect(result).toEqual({ ok: false, reason: 'already_own_person' });
  });

  it('rejects a duplicate pending/approved request', async () => {
    chainableDb.resultsQueue.push([{ id: 5, treeId: 1 }], [linkRow]);

    const result = await requestPersonLink(5, 2, 'user-2');

    expect(result).toEqual({ ok: false, reason: 'link_already_exists' });
  });

  it('creates a pending link request', async () => {
    chainableDb.resultsQueue.push([{ id: 5, treeId: 1 }], [], [linkRow]);

    const result = await requestPersonLink(5, 2, 'user-2');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.link.status).toBe('pending');
  });
});

describe('approvePersonLink', () => {
  it('approves a pending link', async () => {
    chainableDb.resultsQueue.push([{ ...linkRow, status: 'approved', decidedAt: new Date('2024-02-01') }]);

    const result = await approvePersonLink(10);

    expect(result?.status).toBe('approved');
  });

  it('returns null when the link is not pending (or missing)', async () => {
    chainableDb.resultsQueue.push([]);

    const result = await approvePersonLink(10);

    expect(result).toBeNull();
  });
});

describe('rejectPersonLink', () => {
  it('deletes a pending link', async () => {
    chainableDb.resultsQueue.push([linkRow]);
    expect(await rejectPersonLink(10)).toBe(true);
  });

  it('returns false when the link is not pending (or missing)', async () => {
    chainableDb.resultsQueue.push([]);
    expect(await rejectPersonLink(10)).toBe(false);
  });
});

describe('unlinkPersonTree', () => {
  it('deletes a link regardless of status', async () => {
    chainableDb.resultsQueue.push([linkRow]);
    expect(await unlinkPersonTree(10)).toBe(true);
  });

  it('returns false when the link does not exist', async () => {
    chainableDb.resultsQueue.push([]);
    expect(await unlinkPersonTree(10)).toBe(false);
  });
});

describe('getPersonOriginTreeId', () => {
  it('returns the origin tree id', async () => {
    chainableDb.resultsQueue.push([{ treeId: 1 }]);
    expect(await getPersonOriginTreeId(5)).toBe(1);
  });

  it('returns null for a missing person', async () => {
    chainableDb.resultsQueue.push([]);
    expect(await getPersonOriginTreeId(999)).toBeNull();
  });
});

describe('findApprovedLinkedPersonIds', () => {
  it('returns person ids approved-linked to the tree', async () => {
    chainableDb.resultsQueue.push([{ personId: 5 }, { personId: 7 }]);
    expect(await findApprovedLinkedPersonIds(2)).toEqual([5, 7]);
  });
});
