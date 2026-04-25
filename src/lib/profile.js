/**
 * lib/profile.js
 * ─────────────────────────────────────────────────────────────
 * Save and load baby profile data from Supabase.
 *
 * Two tables:
 *   baby_profiles         — current state, one row per user (upsert)
 *   baby_profiles_history — full audit log, new row on every save
 */
import { supabase } from './supabase';

function formToRow(userId, form) {
  return {
    user_id:          userId,
    dob:              form.dob              || null,
    age_months:       form.ageMonths !== '' ? Number(form.ageMonths) : null,
    brand:            form.brand            || null,
    other_brand:      form.otherBrand       || null,
    size:             form.size             || null,
    nursery:          form.nursery          ?? false,
    nursery_days:     form.nurseryDays      || 0,
    nursery_provides: form.nurseryProvides  ?? false,
    stock:            form.stock !== ''     ? Number(form.stock) : null,
    stock_updated_at: new Date().toISOString(), // stamped every save
    fit_status:       form.fitStatus        || null,
    impact:           form.impact           || null,
    impact_set_at:    form.impactSetAt      || null,
    stock_updates:    form.stockUpdates     || 0,
    has_fit_feedback: form.hasFitFeedback   ?? false,
  };
}

function rowToForm(row) {
  return {
    dob:             row.dob              || '',
    ageMonths:       row.age_months       ?? '',
    brand:           row.brand            || null,
    otherBrand:      row.other_brand      || '',
    size:            row.size             || null,
    nursery:         row.nursery          ?? null,
    nurseryDays:     row.nursery_days     || 3,
    nurseryProvides: row.nursery_provides ?? false,
    stock:           row.stock            ?? '',
    stockUpdatedAt:  row.stock_updated_at || null,
    fitStatus:       row.fit_status       || null,
    impact:          row.impact           || null,
    impactSetAt:     row.impact_set_at    || null,
    stockUpdates:    row.stock_updates    || 0,
    hasFitFeedback:  row.has_fit_feedback ?? false,
  };
}

/**
 * Load the user's current profile.
 * Returns null if no profile exists yet (first-time user).
 */
export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('baby_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) { console.error('loadProfile error:', error.message); return null; }
  if (!data) return null;
  return rowToForm(data);
}

/**
 * Save the user's current profile (upsert — one row per user)
 * AND append a history record so every change is preserved.
 */
export async function saveProfile(userId, form) {
  const row = formToRow(userId, form);

  // ── 1. Upsert current profile ──────────────────────────────
  const { error: upsertError } = await supabase
    .from('baby_profiles')
    .upsert(
      { ...row, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (upsertError) {
    console.error('saveProfile upsert error:', upsertError.message);
    return { error: upsertError };
  }

  // ── 2. Insert history record ───────────────────────────────
  // recorded_at is set automatically by Supabase default
  const { error: historyError } = await supabase
    .from('baby_profiles_history')
    .insert({ ...row, recorded_at: new Date().toISOString() });

  if (historyError) {
    // Non-fatal — current profile was saved, just log the history error
    console.error('saveProfile history error:', historyError.message);
  }

  return { error: null };
}
