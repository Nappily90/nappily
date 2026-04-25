/**
 * lib/auth.js
 * ─────────────────────────────────────────────────────────────
 * Auth helper functions — thin wrappers around Supabase auth.
 * All return { data, error } so callers handle errors uniformly.
 */
import { supabase } from './supabase';

/** Sign up with email + password. Supabase sends a confirmation email. */
export async function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}

/** Sign in with email + password. */
export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

/** Send a password reset email. */
export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

/** Sign out the current user. */
export async function signOut() {
  return supabase.auth.signOut({ scope: 'local' });
}

/** Get the current session synchronously from local storage. */
export async function getSession() {
  return supabase.auth.getSession();
}
