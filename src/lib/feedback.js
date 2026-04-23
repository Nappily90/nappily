/**
 * lib/feedback.js
 * ─────────────────────────────────────────────────────────────
 * Saves user feedback to Supabase.
 * accuracy: 'yes' | 'no'
 * reason:   optional follow-up ('fewer' | 'more' | 'size' | null)
 */
import { supabase } from './supabase';

/**
 * @param {string} userId
 * @param {'yes'|'no'} accuracy
 * @param {string|null} reason
 */
export async function saveFeedback(userId, accuracy, reason = null) {
  const { error } = await supabase
    .from('feedback')
    .insert({ user_id: userId, accuracy, reason });

  if (error) console.error('saveFeedback error:', error.message);
  return { error };
}
