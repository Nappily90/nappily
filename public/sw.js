/**
 * sw.js — Nappily Service Worker
 * ─────────────────────────────────────────────────────────────
 * Handles incoming push notifications and notification clicks.
 * Must live in /public so it's served from the root scope.
 */

self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Nappily', body: event.data.text() };
  }

  const options = {
    body:    data.body    || "Time to check your nappy stock.",
    icon:    data.icon    || '/favicon.svg',
    badge:   data.badge   || '/favicon.svg',
    tag:     data.tag     || 'nappily-reminder',
    renotify: true,
    data:    { url: data.url || '/' },
    actions: [
      { action: 'update', title: 'Update stock' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nappily', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const url = event.notification.data?.url || '/';
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Keep service worker alive
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
