/* Service worker: el juego se puede instalar y jugar sin conexión (salvo el modo en línea, que necesita el relay).
   Red primero para los HTML (así cada visita trae la versión nueva) y caché primero para dibujos, audio y scripts. */
const CACHE = 'fondal-v6-1';
const CORE = ['./', './index.html', './apoyar.html', './manifest.webmanifest', './art/icono.svg',
  './eras/era1-celula.html', './eras/era2-animales.html', './eras/era3-tribus.html', './eras/era4-civilizaciones.html', './eras/era5-industria.html', './eras/era6-estrellas.html',
  './eras/audio-lofi.js', './eras/era2-arte.js', './eras/net-lockstep.js', './eras/fondal-plus.js', './art/era3/manifest.js',
  './art/portada/era1.jpg', './art/portada/era2.jpg', './art/portada/era3.jpg', './art/portada/era4.jpg', './art/portada/era5.jpg', './art/portada/era6.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return; const u = new URL(r.url); if (u.origin !== location.origin) return;
  const html = r.mode === 'navigate' || u.pathname.endsWith('.html');
  if (html) e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(m => m || caches.match('./index.html'))));
  else e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })));
});
