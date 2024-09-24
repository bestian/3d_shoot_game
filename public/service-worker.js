const CACHE_NAME = 'plato-shooter-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/game.js',
  '/src/control.js',
  '/src/map.js',
  '/src/monster.js',
  '/assets/shadow_monster.png',
  '/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});