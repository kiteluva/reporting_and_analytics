// worker.js - Service Worker for PWA caching

const CACHE_NAME = 'csv-analyzer-cache-v1';
const urlsToCache = [
    '/',
    'home.html',
    'branches.html',
    'employees.html',
    'time-series.html',
    'complex_stats.html', // Add the new complex_stats.html
    'main.js',           // New main JS file
    'charting.js',       // New charting JS file
    'ui-components.js',  // New UI components JS file
    'data-handlers.js',  // New data handlers JS file
    'home.js',           // New home page specific JS file
    'branches.js',       // New branches page specific JS file
    'employees.js',      // New employees page specific JS file
    'time-series.js',    // New time series page specific JS file
    'complex_stats.js',  // New complex stats page specific JS file
    'style.css',
    'manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js'
    // Add any other static assets or external CDN links your app relies on
];

// Install event: Caches all static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('[Service Worker] Failed to cache during install:', error);
            })
    );
});

// Activate event: Cleans up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: Serves cached content when available, falls back to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // No cache hit - fetch from network
                return fetch(event.request)
                    .then(networkResponse => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and can only be consumed once. We must clone it so that
                        // both the browser and the cache can consume it.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // Only cache GET requests, and don't cache chrome-extension resources
                                if (event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension')) {
                                    cache.put(event.request, responseToCache);
                                }
                            });

                        return networkResponse;
                    })
                    .catch(error => {
                        console.error('[Service Worker] Fetch failed:', event.request.url, error);
                        // You could return an offline page here
                        // For example: return caches.match('offline.html');
                        // For now, it will just fail to load if offline and not in cache.
                    });
            })
    );
});
