// LocaTrack Service Worker — v3 (Robust Background Edition)
const CACHE_NAME = 'locatrack-v3';
const STATIC_ASSETS = [
    './tracker.html',
    './viewer.html',
    './style.css',
    './manifest.json',
    './icon-512.png',
];

// ── Install: cache static assets ──
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ── Activate: remove old caches ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: network first → cache fallback ──
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.protocol === 'chrome-extension:') return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200 && response.type !== 'opaque') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// ── Push Notification (gelecekte kullanım için) ──
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title   = data.title   || 'LocaTrack';
    const options = {
        body:    data.body    || 'Konum güncellemesi var.',
        icon:    './icon-512.png',
        badge:   './icon-512.png',
        vibrate: [200, 100, 200],
        data:    { url: data.url || './tracker.html' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ──
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const client of list) {
                if (client.url.includes('tracker') && 'focus' in client) return client.focus();
            }
            return clients.openWindow('./tracker.html');
        })
    );
});

// ── Keep alive message from page ──
self.addEventListener('message', event => {
    if (event.data === 'keepalive') {
        // Service worker yanıt verir — sayfa canlı olduğunu bilir
        event.ports[0]?.postMessage('alive');
    }
    if (event.data === 'skip-waiting') {
        self.skipWaiting();
    }
});
