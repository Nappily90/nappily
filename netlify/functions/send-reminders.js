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
const RESTOCK_DAYS   = 0; // Send restock nudge when estimated stock hits 0

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
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:600;color:#1C1C1A;letter-spacing:-0.5px;">Napp<em style="color:#7A7870;">ily</em></span>
            </td>
          </tr>
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
              <!-- Two action buttons -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-right:8px;">
                    <a href="https://nappily.app"
                       style="display:block;text-align:center;background:#1C1C1A;color:#FAF9F7;text-decoration:none;
                              padding:14px 20px;border-radius:50px;font-size:14px;font-weight:500;">
                      See best prices
                    </a>
                  </td>
                  <td style="padding-left:8px;">
                    <a href="https://nappily.app"
                       style="display:block;text-align:center;background:#FAF9F7;color:#1C1C1A;text-decoration:none;
                              padding:13px 20px;border-radius:50px;font-size:14px;font-weight:500;
                              border:1.5px solid #D5D2CB;">
                      Update my stock
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0 0;">
              <p style="margin:0 0 8px;font-size:12px;color:#7A7870;">
                If this email landed in spam, please mark it as safe so you don't miss future reminders.
              </p>
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
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:600;color:#1C1C1A;letter-spacing:-0.5px;">Napp<em style="color:#7A7870;">ily</em></span>
            </td>
          </tr>
          <tr>
            <td style="background:#FDECEA;border-radius:20px;padding:32px;">
              <p style="margin:0 0 8px;font-size:13px;color:#A33030;text-transform:uppercase;letter-spacing:1px;">Running very low</p>
              <h1 style="margin:0 0 16px;font-size:36px;color:#1C1C1A;font-weight:700;line-height:1.1;">
                Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#55534E;line-height:1.6;">
                You're almost out of ${brand ? brand + ' size ' + size : 'nappies'}. 
                Order now to avoid running out.
              </p>
              <!-- Two action buttons -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-right:8px;">
                    <a href="https://nappily.app"
                       style="display:block;text-align:center;background:#1C1C1A;color:#FAF9F7;text-decoration:none;
                              padding:14px 20px;border-radius:50px;font-size:14px;font-weight:500;">
                      Order now →
                    </a>
                  </td>
                  <td style="padding-left:8px;">
                    <a href="https://nappily.app"
                       style="display:block;text-align:center;background:#FDECEA;color:#1C1C1A;text-decoration:none;
                              padding:13px 20px;border-radius:50px;font-size:14px;font-weight:500;
                              border:1.5px solid #A33030;">
                      Update my stock
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0 0;">
              <p style="margin:0 0 8px;font-size:12px;color:#7A7870;">
                If this email landed in spam, please mark it as safe so you don't miss future reminders.
              </p>
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

function restockEmailHtml(brand, size) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Did you restock?</title>
</head>
<body style="margin:0;padding:0;background:#FAF9F7;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:600;color:#1C1C1A;letter-spacing:-0.5px;">Napp<em style="color:#7A7870;">ily</em></span>
            </td>
          </tr>
          <tr>
            <td style="background:#fff;border-radius:20px;border:1px solid #EBEBEA;padding:32px;">
              <p style="margin:0 0 8px;font-size:13px;color:#7A7870;text-transform:uppercase;letter-spacing:1px;">Quick check</p>
              <h1 style="margin:0 0 16px;font-size:32px;color:#1C1C1A;font-weight:700;line-height:1.1;">
                Did you restock?
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#7A7870;line-height:1.6;">
                Your ${brand || 'nappy'} supply looks like it may have run out. If you've bought more, update your stock in Nappily so we can keep your reminders accurate.
              </p>
              <a href="https://nappily.app"
                 style="display:inline-block;background:#1C1C1A;color:#FAF9F7;text-decoration:none;
                        padding:14px 28px;border-radius:50px;font-size:15px;font-weight:500;">
                Update my stock →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0;font-size:13px;color:#7A7870;line-height:1.6;">
                Updating your stock keeps your reminders working and helps us give you a more accurate estimate.
              </p>
            </td>
          </tr>
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

    // Get all baby profiles including reminder sent timestamps
    const { data: profiles, error: profileError } = await supabase
      .from('baby_profiles')
      .select('user_id, stock, stock_updated_at, age_months, size, brand, nursery, nursery_days, nursery_provides, impact, impact_set_at, reminder_soft_sent_at, reminder_urgent_sent_at');

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

      const isSoft    = daysLeft > URGENT_DAYS && daysLeft <= SOFT_DAYS;
      const isUrgent  = daysLeft > 0 && daysLeft <= URGENT_DAYS;
      const isRestock = daysLeft <= 0;

      if (!isSoft && !isUrgent && !isRestock) { results.skipped++; continue; }

      // ── Check if reminder already sent this stock cycle ────
      const stockSetAt = profile.stock_updated_at
        ? new Date(profile.stock_updated_at)
        : new Date(0);

      const softSentAt    = profile.reminder_soft_sent_at
        ? new Date(profile.reminder_soft_sent_at) : null;
      const urgentSentAt  = profile.reminder_urgent_sent_at
        ? new Date(profile.reminder_urgent_sent_at) : null;
      const restockSentAt = profile.reminder_restock_sent_at
        ? new Date(profile.reminder_restock_sent_at) : null;

      const softAlreadySent    = softSentAt    && softSentAt    > stockSetAt;
      const urgentAlreadySent  = urgentSentAt  && urgentSentAt  > stockSetAt;
      const restockAlreadySent = restockSentAt && restockSentAt > stockSetAt;

      if (isSoft    && softAlreadySent)    { results.skipped++; continue; }
      if (isUrgent  && urgentAlreadySent)  { results.skipped++; continue; }
      if (isRestock && restockAlreadySent) { results.skipped++; continue; }

      const now = new Date().toISOString();

      const brand = profile.brand || '';
      const size  = profile.size;

      // ── Push notification ──────────────────────────────────
      if (sub) {
        const pushPayload = isRestock
          ? {
              title: 'Did you restock?',
              body:  'Tap to update your stock and keep reminders accurate.',
              tag:   'nappily-restock',
              url:   'https://nappily.app',
            }
          : isUrgent
          ? {
              title: 'Almost out of nappies',
              body:  `${daysLeft} day${daysLeft === 1 ? '' : 's'} left — order now or update your stock.`,
              tag:   'nappily-urgent',
              url:   'https://nappily.app',
            }
          : {
              title: 'Nappy check',
              body:  `About ${daysLeft} days left. Restock soon or update your stock.`,
              tag:   'nappily-soft',
              url:   'https://nappily.app',
            };

        try {
          await webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify(pushPayload));
          results.pushSent++;
          console.log('Push sent successfully to user:', userId);
        } catch (pushErr) {
          console.error('Push error for user', userId, ':',
            pushErr.statusCode, pushErr.body || pushErr.message);
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            // Subscription expired or invalid — remove it
            console.log('Removing expired subscription for user:', userId);
            await supabase.from('push_subscriptions').delete().eq('user_id', userId);
          }
          results.errors++;
        }
      }

      // ── Email reminder ─────────────────────────────────────
      if (email) {
        const subject = isRestock
          ? `Did you restock your ${brand || 'nappies'}?`
          : isUrgent
          ? `You have about ${daysLeft} day${daysLeft === 1 ? '' : 's'} of nappies left`
          : `Stock check — about ${daysLeft} days of nappies remaining`;

        const html = isRestock
          ? restockEmailHtml(brand, size)
          : isUrgent
          ? urgentEmailHtml(daysLeft, brand, size)
          : softEmailHtml(daysLeft, brand, size);

        const text = isRestock
          ? `Hi, your ${brand || 'nappy'} supply looks like it may have run out. If you've bought more, update your stock in Nappily so we can keep your reminders accurate.\n\nUpdate your stock: https://nappily.app`
          : isUrgent
          ? `Hi, you have about ${daysLeft} day${daysLeft === 1 ? '' : 's'} of ${brand || 'nappies'} size ${size} left. Time to order now.\n\nhttps://nappily.app`
          : `Hi, you have about ${daysLeft} days of ${brand || 'nappies'} size ${size} left. A good time to restock soon.\n\nhttps://nappily.app`;

        await sendEmail(email, subject, html, text);
        results.emailSent++;
      }

      // ── Mark reminder as sent ──────────────────────────────
      const flagUpdate = isRestock
        ? { reminder_restock_sent_at: now }
        : isUrgent
        ? { reminder_urgent_sent_at: now }
        : { reminder_soft_sent_at: now };

      await supabase
        .from('baby_profiles')
        .update(flagUpdate)
        .eq('user_id', userId);

      console.log(`Flagged ${isRestock ? 'restock' : isUrgent ? 'urgent' : 'soft'} reminder sent for user ${userId}`);
    }

    console.log('Results:', results);
    return { statusCode: 200, body: JSON.stringify(results) };

  } catch (err) {
    console.error('send-reminders error:', err);
    return { statusCode: 500, body: err.message };
  }
};
