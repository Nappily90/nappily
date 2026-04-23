/**
 * hooks/usePushNotifications.js
 * ─────────────────────────────────────────────────────────────
 * Manages push notification permission state in React.
 * Auto-registers the service worker on mount.
 */
import { useState, useEffect } from 'react';
import {
  isPushSupported,
  isPushGranted,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/notifications';

export function usePushNotifications(userId) {
  const [supported,   setSupported]   = useState(false);
  const [permission,  setPermission]  = useState('default'); // 'default'|'granted'|'denied'
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    const supported = isPushSupported();
    setSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      registerServiceWorker();
    }
  }, []);

  async function requestPermission() {
    if (!userId || !supported) return;
    setSubscribing(true);
    const result = await subscribeToPush(userId);
    setPermission(result === 'granted' ? 'granted' : Notification.permission);
    setSubscribing(false);
    return result;
  }

  async function unsubscribe() {
    if (!userId) return;
    await unsubscribeFromPush(userId);
    setPermission('default');
  }

  return {
    supported,
    permission,
    isGranted:   permission === 'granted',
    isDenied:    permission === 'denied',
    subscribing,
    requestPermission,
    unsubscribe,
  };
}
