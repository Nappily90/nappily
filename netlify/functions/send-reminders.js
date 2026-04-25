/**
 * netlify/functions/send-reminders.js
 * ─────────────────────────────────────────────────────────────
 * Scheduled function — runs daily at 8am UTC.
 * Sends BOTH push notifications AND email reminders.
 *
 * Reminder schedule:
 *   5 days left → soft reminder
 *   3 days left → urgent reminder
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

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = 'Nappily <reminders@nappily.app>';
const SOFT_DAYS      = 5;
const URGENT_DAYS    = 3;

// ─── Email templates ──────────────────────────────────────────

function softEmailHtml(daysLeft, brand, size) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Nappily reminder</title>
</head>
<body style="margin:0;padding:0;background:#FAF9F7;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:600;color:#1C1C1A;letter-spacing:-0.5px;">Napp<em style="color:#7A7870;">ily</em></span>
            </td>
          </tr>

          <!-- Hero card -->
          <tr>
            <td style="background:#fff;border-radius:20px;border:1px solid #EBEBEA;padding:32px;">
              <p style="margin:0 0 8px;font-size:13px;color:#7A7870;text-transform:uppercase;letter-spacing:1px;">Nappy reminder</p>
              <h1 style="margin:0 0 16px;font-size:36px;color:#1C1C1A;font-weight:700;line-height:1.1;">
                About ${daysLeft} days left
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#7A7870;line-height:1.6;">
                You're getting low on ${brand ? brand + ' size ' + size : 'nappies'}. 
                A good time to restock before you run out.
              </p>
              <a href="https://nappily.app" 
                 style="display:inline-block;background:#1C1C1A;color:#FAF9F7;text-decoration:none;
                        padding:14px 28px;border-radius:50px;font-size:15px;font-weight:500;">
                Update my stock
              </a>
            </td>
          </tr>

          <!-- Tip -->
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0;font-size:13px;color:#7A7870;line-height:1.6;">
                💡 Tip: Order now and you'll arrive before you run out. 
                Check today's best prices at <a href="https://nappily.app" style="color:#1C1C1A;">nappily.app</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 0 0;border-top:1px solid #EBEBEA;margin-top:24px;">
              <p style="margin:0;font-size:12px;color:#7A7870;">
                You're receiving this because you enabled reminders on Nappily.<br/>
                <a href="https://nappily.app" style="color:#7A7870;">Manage reminders</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function urgentEmailHtml(daysLeft, brand, size) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Nappily — urgent reminder</title>
</head>
<body style="margin:0;padding:0;background:#FAF9F7;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:600;color:#1C1C1A;letter-spacing:-0.5px;">Napp<em style="color:#7A7870;">ily</em></span>
            </td>
          </tr>

          <!-- Urgent card -->
          <tr>
            <td style="background:#FDECEA;border-radius:20px;border:1px solid #FDECEA;padding:32px;">
              <p style="margin:0 0 8px;font-size:13px;color:#A33030;text-transform:uppercase;letter-spacing:1px;">⚠️ Running very low</p>
              <h1 style="margin:0 0 16px;font-size:36px;color:#1C1C1A;font-weight:700;line-height:1.1;">
                Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#55534E;line-height:1.6;">
                You're almost out of ${brand ? brand + ' size ' + size : 'nappies'}. 
                Order now to avoid running out.
              </p>
              <a href="https://nappily.app"
                 style="display:inline-block;background:#1C1C1A;color:#FAF9F7;text-decoration:none;
                        padding:14px 28px;border-radius:50px;font-size:15px;font-weight:500;">
                Order now →
              </a>
            </td>
          </tr>

          <!-- Best deals nudge -->
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0;font-size:13px;color:#7A7870;line-height:1.6;">
                Open Nappily to see today's best prices across Amazon, Boots, Asda and more.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 0 0;">
              <p style="margin:0;font-size:12px;color:#7A7870;">
                You're receiving this because you enabled reminders on Nappily.<br/>
                <a href="https://nappily.app" style="color:#7A7870;">Manage reminders</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Send email via Resend ────────────────────────────────────

async function sendEmail(to, subject, html, text) {
  if (!RESEND_API_KEY) {
    console.log('No RESEND_API_KEY — skipping email to', to);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:       FROM_EMAIL,
      to:         [to],
      subject,
      html,
      text,   // plain text version — improves deliverability significantly
      headers: {
        // One-click unsubscribe — required by Gmail/Yahoo for bulk senders
        'List-Unsubscribe':       '<https://nappily.app>',
        'List-Unsubscribe-Post':  'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID':        `nappily-reminder-${Date.now()}`,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error for', to, ':', err);
  } else {
    console.log('Email sent to', to);
  }
}

// ─── Rolling stock + days left calculation ────────────────────

/**
 * Calculates estimated current stock and days left.
 *
 * Key insight: stock decreases every day whether or not the user
 * opens the app. We use the saved stock + the timestamp of when
 * it was last set to estimate how many nappies remain today.
 *
 * Formula:
 *   dailyUsage       = prediction model output
 *   daysSinceUpdate  = (now - stock_updated_at) in days
 *   estimatedStock   = savedStock - (dailyUsage × daysSinceUpdate)
 *   daysLeft         = estimatedStock / dailyUsage
 */
function calculateDaysLeft(profile) {
  const { age_months: age, size, stock, stock_updated_at } = profile;
  if (!age || !size || !stock) return null;

  // ── Step 1: base usage from age ──────────────────────────
  let base;
  if (age <= 2)       base = 11;
  else if (age <= 5)  base = 9;
  else if (age <= 8)  base = 7;
  else if (age <= 12) base = 6;
  else if (age <= 18) base = 5;
  else                base = 4;

  // ── Step 2: size adjustment ──────────────────────────────
  let usage = base + (size <= 2 ? 1 : size <= 4 ? 0 : -1);

  // ── Step 3: nursery adjustment ───────────────────────────
  if (profile.nursery && profile.nursery_provides && profile.nursery_days) {
    usage *= (7 - profile.nursery_days) / 7;
  }

  // ── Step 4: impact adjustment ────────────────────────────
  if (profile.impact && profile.impact !== 'normal' && profile.impact_set_at) {
    const impactDays = (Date.now() - new Date(profile.impact_set_at).getTime()) / 86400000;
    if (impactDays <= 3) {
      usage *= { more: 1.125, fewer: 0.85, tummy: 1.3 }[profile.impact] || 1;
    }
  }

  usage = Math.max(1, usage);

  // ── Step 5: rolling stock calculation ────────────────────
  // Work out how many days have passed since the user last set their stock
  const stockSetAt     = stock_updated_at ? new Date(stock_updated_at) : new Date();
  const daysSinceUpdate = Math.max(0, (Date.now() - stockSetAt.getTime()) / 86400000);

  // Estimate how many nappies they have used since last update
  const nappiesUsedSince = daysSinceUpdate * usage;

  // Estimated current stock — floor at 0
  const estimatedStock = Math.max(0, stock - nappiesUsedSince);

  console.log(
    `User stock: saved=${stock}, daysSince=${daysSinceUpdate.toFixed(1)}, ` +
    `usage=${usage.toFixed(1)}/day, estimated=${estimatedStock.toFixed(1)} remaining`
  );

  // ── Step 6: days left from estimated stock ────────────────
  return Math.round(estimatedStock / usage);
}

// ─── Main handler ─────────────────────────────────────────────

export const handler = async () => {
  console.log('send-reminders starting...');

  try {
    // Get all users with push subscriptions
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription');

    if (subError) throw subError;

    // Get all baby profiles
    const { data: profiles, error: profileError } = await supabase
      .from('baby_profiles')
      .select('user_id, stock, stock_updated_at, age_months, size, brand, nursery, nursery_days, nursery_provides, impact, impact_set_at');

    if (profileError) throw profileError;

    // Get all user emails
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id, email');

    // Fallback: get emails via admin API if above fails
    let emailMap = {};
    if (!userError && users) {
      users.forEach(u => { emailMap[u.id] = u.email; });
    } else {
      // Use service role to get user emails
      const { data: { users: adminUsers } } = await supabase.auth.admin.listUsers();
      if (adminUsers) {
        adminUsers.forEach(u => { emailMap[u.id] = u.email; });
      }
    }

    const results = { pushSent: 0, emailSent: 0, skipped: 0, errors: 0 };

    // Process all profiles (not just push subscribers)
    const allUserIds = [...new Set([
      ...(subs || []).map(s => s.user_id),
      ...(profiles || []).map(p => p.user_id),
    ])];

    for (const userId of allUserIds) {
      const profile  = profiles?.find(p => p.user_id === userId);
      const sub      = subs?.find(s => s.user_id === userId);
      const email    = emailMap[userId];

      if (!profile?.stock || !profile?.size) { results.skipped++; continue; }

      const daysLeft = calculateDaysLeft(profile);
      if (daysLeft === null) { results.skipped++; continue; }

      const isSoft   = daysLeft > URGENT_DAYS && daysLeft <= SOFT_DAYS;
      const isUrgent = daysLeft <= URGENT_DAYS;

      if (!isSoft && !isUrgent) { results.skipped++; continue; }

      const brand = profile.brand || '';
      const size  = profile.size;

      // ── Push notification ──────────────────────────────────
      if (sub) {
        const pushPayload = isUrgent
          ? { title: '🚨 Almost out of nappies', body: `Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left — order now.`, tag: 'nappily-urgent' }
          : { title: '🧷 Nappy reminder',         body: `About ${daysLeft} days left — good time to restock.`,               tag: 'nappily-soft'   };

        try {
          await webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify(pushPayload));
          results.pushSent++;
        } catch (pushErr) {
          if (pushErr.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('user_id', userId);
          }
          results.errors++;
        }
      }

      // ── Email reminder ─────────────────────────────────────
      if (email) {
        const subject = isUrgent
          ? `You have about ${daysLeft} day${daysLeft === 1 ? '' : 's'} of nappies left`
          : `Stock check — about ${daysLeft} days of nappies remaining`;

        const html = isUrgent
          ? urgentEmailHtml(daysLeft, brand, size)
          : softEmailHtml(daysLeft, brand, size);

        const text = isUrgent
          ? `Hi, you have about ${daysLeft} day${daysLeft === 1 ? '' : 's'} of ${brand || 'nappies'} size ${size} left. Time to order now to avoid running out.\n\nOpen Nappily to see the best prices: https://nappily.app\n\nYou're receiving this because you enabled reminders on Nappily.`
          : `Hi, you have about ${daysLeft} days of ${brand || 'nappies'} size ${size} left. A good time to restock soon.\n\nOpen Nappily to see the best prices: https://nappily.app\n\nYou're receiving this because you enabled reminders on Nappily.`;

        await sendEmail(email, subject, html, text);
        results.emailSent++;
      }
    }

    console.log('Results:', results);
    return { statusCode: 200, body: JSON.stringify(results) };

  } catch (err) {
    console.error('send-reminders error:', err);
    return { statusCode: 500, body: err.message };
  }
};
