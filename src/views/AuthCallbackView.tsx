import supabase from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function AuthCallbackView() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code || !supabase) {
      setError('Missing auth code');
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError(error.message);
      } else {
        window.location.replace('/');
      }
    });
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-center">
        <p className="text-red-500">Authentication failed: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-center">
      <p className="text-muted-foreground">Signing in...</p>
    </div>
  );
}
