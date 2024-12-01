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
        // Cache root path
        await cache.add('./');
        // Cache static assets
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
      // Clear old caches
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
        // Try cache first
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fall back to network
        const response = await fetch(event.request);
        
        // Cache successful responses
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
        // Return cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          return cache.match('./index.html');
        }
        throw err;
      }
    })()
  );
});

// Push notification event
self.addEventListener('push', event => {
  const options = {
    body: event.data?.text() || 'Time to take your medicine',
    icon: './favicon.ico',
    badge: './favicon.ico',
    actions: [
      { action: 'take', title: 'Take Now' },
      { action: 'snooze', title: 'Snooze' }
    ],
    requireInteraction: true,
    tag: 'medicine-reminder'
  };

  event.waitUntil(
    self.registration.showNotification('Medicine Reminder', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'take') {
    event.waitUntil(
      (async () => {
        try {
          await storeRecord({
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

// IndexedDB setup
const DB_NAME = 'MedicineDB';
const STORE_NAME = 'medicine-records';
const DB_VERSION = 1;

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { 
          keyPath: 'time',
          autoIncrement: true 
        });
      }
    };
  });
}

async function storeRecord(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const request = store.add(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

// Background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-medicines') {
    event.waitUntil(syncRecords());
  }
});

async function syncRecords() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const records = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (records.length > 0) {
      const response = await fetch('./api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(records)
      });

      if (response.ok) {
        const deleteTx = db.transaction(STORE_NAME, 'readwrite');
        const deleteStore = deleteTx.objectStore(STORE_NAME);
        await new Promise((resolve, reject) => {
          const request = deleteStore.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }
  } catch (err) {
    console.error('Sync failed:', err);
  }
}