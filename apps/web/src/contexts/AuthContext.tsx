import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../api/client';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  completeOAuthCallback: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.auth.me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    setUser(result.user);
  };

  const signOut = async () => {
    await api.auth.logout();
    setUser(null);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  };

  // Runs on the /auth/callback landing page after Supabase redirects back from
  // Google. The browser briefly holds a real Supabase session (placed by
  // `detectSessionInUrl` in lib/supabase.ts) purely to hand its tokens to the
  // API, which mints the same httpOnly cookie session the password login flow
  // uses. We must NOT call supabase.auth.signOut() here: even with
  // `scope: 'local'` it calls GoTrue's /logout endpoint and revokes the
  // session's refresh token server-side — the same token just handed to the
  // API for the cookie session, killing it on arrival. persistSession is
  // already false (lib/supabase.ts), so there is no local storage to clean up.
  const completeOAuthCallback = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error(error?.message ?? 'No session found');
    const { access_token: accessToken, refresh_token: refreshToken } = data.session;
    const result = await api.auth.oauthSession(accessToken, refreshToken);
    setUser(result.user);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signIn, signOut, signInWithGoogle, completeOAuthCallback }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
