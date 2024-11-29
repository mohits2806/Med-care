// public/sw.js
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'taken') {
        // Handle "Mark as Taken" action
        console.log('Medicine marked as taken');
    }
    
    // Focus or open app window
    event.waitUntil(
        clients.matchAll({type: 'window'}).then(clientList => {
            if (clientList.length > 0) {
                clientList[0].focus();
            } else {
                clients.openWindow('/');
            }
        })
    );
});