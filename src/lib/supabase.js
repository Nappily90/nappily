/**
 * lib/supabase.js
 * ─────────────────────────────────────────────────────────────
 * Supabase client — single instance shared across the whole app.
 *
 * Credentials are read from Vite env vars so they never get
 * hardcoded into source. In production Netlify reads them from
 * environment variables set in the Netlify dashboard.
 *
 * Required env vars (set in Netlify → Site settings → Environment):
 *   VITE_SUPABASE_URL      e.g. https://mwdryzfskhkjwwoqlfpo.supabase.co
 *   VITE_SUPABASE_ANON_KEY e.g. sb_publishable_5sJ-...
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file or Netlify dashboard.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
