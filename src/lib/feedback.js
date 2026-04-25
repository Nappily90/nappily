/**
 * lib/feedback.js
 * ─────────────────────────────────────────────────────────────
 * Saves user feedback with full prediction context snapshot.
 * Every submission is a new row — nothing is overwritten.
 */
import { supabase } from './supabase';

export async function saveFeedback(userId, accuracy, reason = null, context = null) {
  const row = {
    user_id:          userId,
    accuracy,
    reason,
    // Prediction snapshot
    age_months:       context?.ageMonths       ?? null,
    size:             context?.size            ?? null,
    brand:            context?.brand           ?? null,
    stock:            context?.stock           ?? null,
    daily_usage:      context?.dailyUsage      ?? null,
    days_left:        context?.daysLeft        ?? null,
    transition_state: context?.transitionState ?? null,
    // Factors affecting usage
    nursery:          context?.nursery         ?? null,
    nursery_days:     context?.nurseryDays     ?? null,
    nursery_provides: context?.nurseryProvides ?? null,
    fit_status:       context?.fitStatus       ?? null,
    impact:           context?.impact          ?? null,
    impact_active:    context?.impactActive    ?? null,
  };

  const { error } = await supabase
    .from('feedback')
    .insert(row);

  if (error) console.error('saveFeedback error:', error.message);
  return { error };
}
