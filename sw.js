// sw.js
const CACHE_NAME = 'medicine-reminder-v1';
const STATIC_ASSETS = [
  './index.html',
  './style.css',
  './script.js',
  './notification.mp3',
  './manifest.json',
  './favicon.ico'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('Caching static assets');
        for (const asset of STATIC_ASSETS) {
          try {
            await cache.add(new Request(asset, { cache: 'reload' }));
          } catch (err) {
            console.warn(`Failed to cache: ${asset}`, err);
          }
        }
        await self.skipWaiting();
      } catch (err) {
        console.error('Cache installation failed:', err);
      }
    })()
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }

        const response = await fetch(event.request);
        
        if (response.ok && response.type === 'basic') {
          const responseToCache = response.clone();
          try {
            await cache.put(event.request, responseToCache);
          } catch (err) {
            console.warn('Cache put failed:', err);
          }
        }
        
        return response;
      } catch (err) {
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          return cache.match('./index.html');
        }
        throw err;
      }
    })()
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'take') {
    event.waitUntil(
      (async () => {
        try {
          storeRecord({
            time: new Date().toISOString(),
            action: 'taken'
          });
        } catch (err) {
          console.error('Failed to store record:', err);
        }
      })()
    );
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        if (windowClients.length > 0) {
          return windowClients[0].focus();
        }
        return clients.openWindow('./');
      })
  );
});

// Store record in localStorage
function storeRecord(record) {
  const records = JSON.parse(localStorage.getItem('medicineRecords') || '[]');
  records.push(record);
  localStorage.setItem('medicineRecords', JSON.stringify(records));
}

// Background sync (simulated with setInterval)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-medicines') {
    event.waitUntil(syncRecords());
  }
});

function syncRecords() {
  try {
    const records = JSON.parse(localStorage.getItem('medicineRecords') || '[]');
    if (records.length > 0) {
      console.log('Syncing records:', records);
      // Simulate successful sync by clearing localStorage
      localStorage.removeItem('medicineRecords');
    }
  } catch (err) {
    console.error('Sync failed:', err);
  }
}

// Simulate background sync every 5 minutes
setInterval(() => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(registration => {
      registration.sync.register('sync-medicines');
    }).catch(err => console.error('Sync registration failed:', err));
  }
}, 300000); // 5 minutes