import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { upsertProfile, createPersonalTreeIfNeeded, getProfile, setPrimaryTree, updateProfileSettings as updateProfileSettingsQuery } from '@wongsorn-labs/atlas-lineage-db';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    );
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(error?.message ?? 'Sign-in failed');
    await upsertProfile(data.user.id, data.user.email!);
    await createPersonalTreeIfNeeded(data.user.id);
    const profile = await getProfile(data.user.id);
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: { id: data.user.id, email: data.user.email, defaultCountry: profile?.defaultCountry ?? null, primaryTreeId: profile?.primaryTreeId ?? null },
    };
  }

  async refreshSession(refreshToken: string) {
    const { data, error } = await this.supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) throw new Error(error?.message ?? 'Refresh failed');
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  async exchangeOAuthSession(accessToken: string, refreshToken: string) {
    const { data, error } = await this.supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      console.error('[oauth/session] getUser failed', { message: error?.message, status: error?.status, code: error?.code });
      throw new UnauthorizedException('Invalid or expired session');
    }
    await upsertProfile(data.user.id, data.user.email!);
    await createPersonalTreeIfNeeded(data.user.id);
    const profile = await getProfile(data.user.id);
    return {
      accessToken,
      refreshToken,
      user: { id: data.user.id, email: data.user.email, defaultCountry: profile?.defaultCountry ?? null, primaryTreeId: profile?.primaryTreeId ?? null },
    };
  }

  async signOut(accessToken: string) {
    await this.supabase.auth.admin.signOut(accessToken);
  }

  async getUser(accessToken: string) {
    const { data, error } = await this.supabase.auth.getUser(accessToken);
    if (error || !data.user) return null;
    const profile = await getProfile(data.user.id);
    return {
      id: data.user.id,
      email: data.user.email,
      defaultCountry: profile?.defaultCountry ?? null,
      primaryTreeId: profile?.primaryTreeId ?? null,
    };
  }

  async updateProfileSettings(userId: string, input: { defaultCountry?: string | null; primaryTreeId?: number | null }) {
    let current = await getProfile(userId);

    if (input.primaryTreeId !== undefined) {
      const updated = await setPrimaryTree(userId, input.primaryTreeId);
      if (!updated) throw new NotFoundException('Tree not found or not a member');
      current = updated;
    }
    if (input.defaultCountry !== undefined) {
      current = await updateProfileSettingsQuery(userId, input.defaultCountry);
    }
    return current;
  }
}
