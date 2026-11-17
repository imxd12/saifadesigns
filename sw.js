/**
 * SAIFA DESIGNS Atelier & Boutique — Enterprise PWA Service Worker
 * Version: saifa-atelier-v1.1.0
 * Features: Offline Shell, Stale-While-Revalidate Cache, Background Sync, Push Notifications
 */

const CACHE_NAME = 'saifa-atelier-v1.1.0';
const DYNAMIC_CACHE = 'saifa-dynamic-v1.1.0';

// Essential App Shell Assets
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/readymade.html',
  '/product.html',
  '/privacy.html',
  '/terms.html',
  '/returns.html',
  '/css/style.css',
  '/css/admin.css',
  '/css/login.css',
  '/js/data.js',
  '/js/security.js',
  '/js/backend.js',
  '/js/customer.js',
  '/js/ai.js',
  '/js/worker.js',
  '/js/admin.js',
  '/js/app.js',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Install Event: Pre-cache App Shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Pre-caching offline app shell');
      // Use addAll with error resilience
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url).catch(err => console.warn(`[SW] Precache skipped for ${url}:`, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Cleanup Stale Caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            console.log('[ServiceWorker] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-First for static, Network-First for navigation & dynamic
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass non-GET requests and Firebase realtime/firestore sockets
  if (req.method !== 'GET') return;
  if (url.protocol.startsWith('chrome-extension')) return;
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('firestore.googleapis.com')) {
    return; // Handled directly by Firebase SDK with offline persistence
  }

  // 1. Navigation requests (HTML pages) -> Network first, fallback to cached page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(networkResp => {
        if (networkResp.status === 200) {
          const respClone = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, respClone));
        }
        return networkResp;
      }).catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Fallback to cached index.html shell
        const shell = await caches.match('/index.html');
        return shell || new Response('Offline - SAIFA DESIGNS Atelier (Please reconnect to view live orders)', {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }

  // 2. Static Assets (CSS, JS, Images, Fonts) -> Stale-While-Revalidate
  const isStatic = url.pathname.match(/\.(css|js|svg|png|jpg|jpeg|webp|woff2?|ttf|ico)$/i) ||
                  url.hostname.includes('fonts.googleapis.com') ||
                  url.hostname.includes('fonts.gstatic.com') ||
                  url.hostname.includes('images.unsplash.com') ||
                  url.hostname.includes('cdnjs.cloudflare.com');

  if (isStatic) {
    event.respondWith(
      caches.match(req).then(cachedResp => {
        const fetchPromise = fetch(req).then(networkResp => {
          if (networkResp && networkResp.status === 200) {
            const respClone = networkResp.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(req, respClone));
          }
          return networkResp;
        }).catch(() => null);

        // Return cached immediately if available, otherwise wait for network
        return cachedResp || fetchPromise;
      })
    );
    return;
  }

  // Default network with dynamic fallback
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

// Push Notification Event: Deliver Atelier updates directly to customer phone
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'SAIFA DESIGNS Atelier', body: event.data ? event.data.text() : 'Atelier status update' };
  }

  const title = data.title || 'SAIFA DESIGNS Boutique';
  const options = {
    body: data.body || 'Your bespoke garment tailoring has reached a new milestone ✨',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 150],
    data: {
      url: data.url || '/#track',
      orderNo: data.orderNo || ''
    },
    actions: [
      { action: 'track', title: '📦 Track Milestone' },
      { action: 'contact', title: '💬 WhatsApp Studio' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/#track';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Background Sync Hook for Offline Orders
self.addEventListener('sync', event => {
  if (event.tag === 'saifa-offline-order-sync') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
        });
      })
    );
  }
});
