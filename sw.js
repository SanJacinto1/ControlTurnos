const CACHE = 'control-turno-v7';
const ARCHIVOS = ['./', 'index.html', 'style.css', 'logic.js', 'app.js', 'logo.svg', 'icon.svg', 'manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(claves => Promise.all(
      claves.filter(clave => clave !== CACHE).map(clave => caches.delete(clave))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(respuesta => respuesta || fetch(event.request))
  );
});
