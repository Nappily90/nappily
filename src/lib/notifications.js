/**
 * lib/notifications.js
 * ─────────────────────────────────────────────────────────────
 * Browser push notification helpers.
 *
 * Flow:
 *   1. Register service worker
 *   2. Request permission from user
 *   3. Subscribe to push via PushManager
 *   4. Save subscription to Supabase (push_subscriptions table)
 *   5. Netlify function sends pushes via web-push on a schedule
 */
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Converts a base64 VAPID public key to a Uint8Array
 * (required by PushManager.subscribe)
 */
function urlBase64ToUint8Array(base64String) {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

/**
 * Returns true if push notifications are supported and
 * the user has already granted permission.
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export function isPushGranted() {
  return Notification.permission === 'granted';
}

/**
 * Registers the service worker.
 * Safe to call multiple times — returns existing registration if already registered.
 */
export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}

/**
 * Requests push permission and subscribes the user.
 * Saves the subscription endpoint to Supabase so the server can send pushes.
 *
 * @param {string} userId
 * @returns {'granted'|'denied'|'unsupported'|'error'}
 */
export async function subscribeToPush(userId) {
  if (!isPushSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const registration   = await registerServiceWorker();
    if (!registration) return 'error';

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Save to Supabase so the Netlify function can send pushes
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id:      userId,
        endpoint:     subscription.endpoint,
        subscription: JSON.stringify(subscription),
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to save push subscription:', error.message);
      return 'error';
    }

    return 'granted';
  } catch (err) {
    console.error('Push subscription error:', err);
    return 'error';
  }
}

/**
 * Unsubscribes the user from push notifications and removes
 * their subscription from Supabase.
 */
export async function unsubscribeFromPush(userId) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);
  } catch (err) {
    console.error('Unsubscribe error:', err);
  }
}
