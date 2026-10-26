/* Receptor Web Push. La suscripción se activa desde la web publicada. */
self.addEventListener('push', event => {
  let message = {};
  try { message = event.data?.json() || {}; } catch {}
  const title = typeof message.title === 'string' ? message.title.slice(0,100) : 'Nuestra alcancía 💜';
  const body = typeof message.body === 'string' ? message.body.slice(0,250) : 'Tienes un nuevo aviso. Abre tu alcancía para verlo.';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: './icon-192.png',
    tag: typeof message.id === 'string' ? message.id.slice(0,120) : 'alcancia-aviso',
    data: {url: self.registration.scope}
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL(self.registration.scope);
    const tabs = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing = tabs.find(tab => tab.url.startsWith(target.href));
    if (existing) return existing.focus();
    return self.clients.openWindow(target.href);
  })());
});
