/**
 * netlify/functions/send-reminders.js
 * ─────────────────────────────────────────────────────────────
 * Scheduled Netlify function — runs daily at 8am UTC.
 * Sends push notifications to users at 5 days and 3 days remaining.
 */
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SOFT_DAYS   = 5;
const URGENT_DAYS = 3;

export const handler = async () => {
  try {
    // Get all push subscriptions
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription');

    if (subError) throw subError;
    if (!subs?.length) return { statusCode: 200, body: 'No subscribers' };

    // Get their baby profiles
    const userIds = subs.map(s => s.user_id);
    const { data: profiles, error: profileError } = await supabase
      .from('baby_profiles')
      .select('user_id, stock, age_months, size, nursery, nursery_days, nursery_provides, impact, impact_set_at')
      .in('user_id', userIds);

    if (profileError) throw profileError;

    const results = { sent: 0, skipped: 0, errors: 0 };

    for (const sub of subs) {
      const profile = profiles?.find(p => p.user_id === sub.user_id);
      if (!profile?.stock || !profile?.size) { results.skipped++; continue; }

      const daysLeft = calculateDaysLeft(profile);
      if (daysLeft === null) { results.skipped++; continue; }

      const isSoft   = daysLeft > URGENT_DAYS && daysLeft <= SOFT_DAYS;
      const isUrgent = daysLeft <= URGENT_DAYS;
      if (!isSoft && !isUrgent) { results.skipped++; continue; }

      const notification = isUrgent
        ? {
            title: '🚨 Almost out of nappies',
            body:  `About ${Math.round(daysLeft)} day${daysLeft === 1 ? '' : 's'} left — time to order now.`,
            tag:   'nappily-urgent',
          }
        : {
            title: '🧷 Nappy reminder',
            body:  `About ${Math.round(daysLeft)} days left — a good time to restock soon.`,
            tag:   'nappily-soft',
          };

      try {
        await webpush.sendNotification(
          JSON.parse(sub.subscription),
          JSON.stringify(notification)
        );
        results.sent++;
      } catch (pushErr) {
        // Subscription expired — remove it
        if (pushErr.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('user_id', sub.user_id);
        }
        results.errors++;
      }
    }

    console.log('Reminder results:', results);
    return { statusCode: 200, body: JSON.stringify(results) };

  } catch (err) {
    console.error('send-reminders error:', err);
    return { statusCode: 500, body: err.message };
  }
};

function calculateDaysLeft(profile) {
  const { age_months: age, size, stock } = profile;
  if (!age || !size || !stock) return null;

  let base;
  if (age <= 2)       base = 11;
  else if (age <= 5)  base = 9;
  else if (age <= 8)  base = 7;
  else if (age <= 12) base = 6;
  else if (age <= 18) base = 5;
  else                base = 4;

  let usage = base + (size <= 2 ? 1 : size <= 4 ? 0 : -1);

  if (profile.nursery && profile.nursery_provides && profile.nursery_days) {
    usage *= (7 - profile.nursery_days) / 7;
  }

  if (profile.impact && profile.impact !== 'normal' && profile.impact_set_at) {
    const daysSince = (Date.now() - new Date(profile.impact_set_at).getTime()) / 86400000;
    if (daysSince <= 3) {
      usage *= { more: 1.125, fewer: 0.85, tummy: 1.3 }[profile.impact] || 1;
    }
  }

  return Math.round(Math.max(1, stock / Math.max(1, usage)));
}
