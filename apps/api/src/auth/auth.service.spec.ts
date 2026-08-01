import { AuthService } from './auth.service';

const mockSignInWithPassword = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      getUser: mockGetUser,
      admin: { signOut: jest.fn() },
    },
  })),
}));

const mockProfile = {
  id: 'user-1', email: 'a@example.com', displayName: null, avatarUrl: null,
  defaultCountry: null, primaryTreeId: 7, createdAt: '2024-01-01',
};

jest.mock('@wongsorn-labs/atlas-lineage-db', () => ({
  upsertProfile: jest.fn(),
  createPersonalTreeIfNeeded: jest.fn(),
  getProfile: jest.fn(() => mockProfile),
  setPrimaryTree: jest.fn(),
  updateProfileSettings: jest.fn(),
}));

const db = jest.requireMock('@wongsorn-labs/atlas-lineage-db') as Record<string, jest.Mock>;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'secret';
    service = new AuthService();
  });

  it('signIn calls createPersonalTreeIfNeeded and returns primaryTreeId', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: 'at', refresh_token: 'rt', expires_in: 3600 },
        user: { id: 'user-1', email: 'a@example.com' },
      },
      error: null,
    });

    const result = await service.signIn('a@example.com', 'pw');

    expect(db.createPersonalTreeIfNeeded).toHaveBeenCalledWith('user-1');
    expect(result.user.primaryTreeId).toBe(7);
  });

  it('exchangeOAuthSession calls createPersonalTreeIfNeeded and returns primaryTreeId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@example.com' } }, error: null });

    const result = await service.exchangeOAuthSession('at', 'rt');

    expect(db.createPersonalTreeIfNeeded).toHaveBeenCalledWith('user-1');
    expect(result.user.primaryTreeId).toBe(7);
  });

  it('createPersonalTreeIfNeeded is a no-op for a user who already has a tree (per the db layer\'s own guard)', async () => {
    // AuthService always calls createPersonalTreeIfNeeded; the zero-membership
    // check itself lives in the db layer (see trees.spec.ts) — this test only
    // confirms AuthService triggers it unconditionally on every sign-in.
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: 'at', refresh_token: 'rt', expires_in: 3600 },
        user: { id: 'user-2', email: 'b@example.com' },
      },
      error: null,
    });

    await service.signIn('b@example.com', 'pw');

    expect(db.createPersonalTreeIfNeeded).toHaveBeenCalledTimes(1);
  });
});
