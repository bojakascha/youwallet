const CACHE_NAME = 'pwa-cache-v1';
const urlsToCache = [
    '/',
    './index.html',
    './css/styles2.css',  // Replace with your CSS
    './js/main.js',     // Replace with your JavaScript file
    './manifest.json'
];

// Install the service worker and cache the required assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch cached assets when offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // If the resource is in the cache, serve it
                if (response) {
                    return response;
                }
                // Otherwise, fetch it from the network
                return fetch(event.request);
            })
    );
});