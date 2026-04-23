/**
 * hooks/useAuth.js
 * ─────────────────────────────────────────────────────────────
 * React hook that tracks Supabase auth state.
 *
 * Returns:
 *   user        — the current Supabase user object, or null
 *   loading     — true while the initial session is being resolved
 *   signOut     — function to sign out
 *
 * Subscribes to onAuthStateChange so the UI reacts immediately
 * to login, logout, and token refresh without any polling.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Resolve the existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signOut: handleSignOut };
}
