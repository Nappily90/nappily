import { supabase } from './supabase';

function formToRow(userId, form) {
  return {
    user_id:           userId,
    dob:               form.dob               || null,
    age_months:        form.ageMonths !== ''   ? Number(form.ageMonths) : null,
    brand:             form.brand              || null,
    other_brand:       form.otherBrand         || null,
    size:              form.size               || null,
    nursery:           form.nursery            ?? false,
    nursery_days:      form.nurseryDays        || 0,
    nursery_provides:  form.nurseryProvides    ?? false,
    stock:             form.stock !== ''       ? Number(form.stock) : null,
    fit_status:        form.fitStatus          || null,
    impact:            form.impact             || null,
    impact_set_at:     form.impactSetAt        || null,
    stock_updates:     form.stockUpdates       || 0,
    has_fit_feedback:  form.hasFitFeedback     ?? false,
    updated_at:        new Date().toISOString(),
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
    fitStatus:       row.fit_status       || null,
    impact:          row.impact           || null,
    impactSetAt:     row.impact_set_at    || null,
    stockUpdates:    row.stock_updates    || 0,
    hasFitFeedback:  row.has_fit_feedback ?? false,
  };
}

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

export async function saveProfile(userId, form) {
  const { error } = await supabase
    .from('baby_profiles')
    .upsert(formToRow(userId, form), { onConflict: 'user_id' });

  if (error) { console.error('saveProfile error:', error.message); return { error }; }
  return { error: null };
}
