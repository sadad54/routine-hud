// Imported into the Workbox service worker: clicking a notification focuses the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
      return self.clients.openWindow(url);
    }),
  );
});
