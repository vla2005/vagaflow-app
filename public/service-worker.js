const APP_NAME = 'VagaFlow';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let message = {};

  try {
    message = event.data?.json() || {};
  } catch {
    message = { body: event.data?.text() };
  }

  const unreadCount = Number(message.unreadCount || 0);
  const tasks = [self.registration.showNotification(message.title || APP_NAME, {
    body: message.body || 'Uma nova oportunidade combina com seu perfil.',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: message.jobId ? `job-${message.jobId}` : 'new-opportunity',
    renotify: true,
    data: { url: message.url || '/vagas' },
  })];

  if ('setAppBadge' in self.navigator) {
    tasks.push(unreadCount > 0
      ? self.navigator.setAppBadge(unreadCount)
      : self.navigator.clearAppBadge());
  }

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/vagas', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);

    if (existing) {
      await existing.navigate(targetUrl);
      return existing.focus();
    }

    return self.clients.openWindow(targetUrl);
  })());
});
