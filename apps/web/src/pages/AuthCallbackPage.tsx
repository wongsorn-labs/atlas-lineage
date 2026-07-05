import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function AuthCallbackPage() {
  const { completeOAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    completeOAuthCallback()
      .then(() => {
        window.location.replace('/');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      });
    // Runs once on landing; completeOAuthCallback either navigates away or
    // settles into the error state below, so it doesn't need to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[--bg-base] px-6">
        <div className="glass-card flex max-w-sm flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-[--color-error]" />
          <h1 className="font-display text-lg font-semibold text-[--text-primary]">Sign-in failed</h1>
          <p className="text-sm text-[--text-secondary]">{error}</p>
          <a href="/" className="btn-primary">Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[--bg-base] text-[--text-muted]">
      <div className="flex items-center gap-2 text-sm" role="status">
        <Loader2 className="h-4 w-4 animate-spin" />
        Signing in…
      </div>
    </div>
  );
}
