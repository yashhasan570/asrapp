/* Asr service worker — precache the app shell, serve offline, network-first
   for navigations so a deploy is picked up on the next online load. */
const VERSION = 'asr-v2';

const SHELL = [
    './',
    './index.html',
    './manifest.json',
    './assets/css/style.css',
    './assets/js/engine.js',
    './assets/js/app.js',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/favicon.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(VERSION)
            .then((cache) => cache.addAll(SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).then((res) => {
                const copy = res.clone();
                caches.open(VERSION).then((c) => c.put('./index.html', copy));
                return res;
            }).catch(() => caches.match('./index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(req).then((hit) => hit || fetch(req).then((res) => {
            // opaque CDN responses are cacheable and keep the app working offline
            if (res.ok || res.type === 'opaque') {
                const copy = res.clone();
                caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
        }))
    );
});