/**
 * lib/feedback.js
 * ─────────────────────────────────────────────────────────────
 * Saves user feedback to Supabase with full prediction context.
 * Each submission is a new row — nothing is overwritten.
 */
import { supabase } from './supabase';

/**
 * @param {string} userId
 * @param {'yes'|'no'} accuracy
 * @param {string|null} reason      - 'fewer' | 'more' | 'size' | null
 * @param {object|null} context     - prediction snapshot at time of feedback
 */
export async function saveFeedback(userId, accuracy, reason = null, context = null) {
  const row = {
    user_id:          userId,
    accuracy,
    reason,
    // Snapshot of prediction at time of feedback
    age_months:       context?.ageMonths       || null,
    size:             context?.size            || null,
    brand:            context?.brand           || null,
    stock:            context?.stock           || null,
    daily_usage:      context?.dailyUsage      || null,
    days_left:        context?.daysLeft        || null,
    transition_state: context?.transitionState || null,
  };

  const { error } = await supabase
    .from('feedback')
    .insert(row);

  if (error) console.error('saveFeedback error:', error.message);
  return { error };
}
