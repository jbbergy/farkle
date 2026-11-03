// Service worker du Farkle : le jeu s’installe comme une application et se lance sans réseau une fois visité.
// - La page : le réseau d’abord (pour recevoir les nouvelles versions), la copie gardée si le réseau manque.
// - Three.js, cannon-es (versions figées sur cdn.jsdelivr.net) et les fichiers des polices : gardés une fois pour toutes.
// - Les sons et la feuille des polices : servis depuis la copie gardée, rafraîchie en arrière-plan.
// - La musique est lue en flux (requêtes « Range ») : on garde le fichier entier et on en découpe les morceaux.
// Changer VERSION quand la liste ci-dessous change : l’ancienne copie est alors effacée.
const VERSION = 'farkle-1';
const SHELL = ['./', 'manifest.webmanifest', 'icons/icone.svg', 'icons/icone-192.png', 'icons/icone-512.png', 'icons/icone-apple.png'];
const LIBS = [
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js',
  'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll([...SHELL, ...LIBS])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') e.respondWith(networkFirst(req));
  else if (url.origin === location.origin) e.respondWith(req.headers.has('range') ? fromRange(req) : staleWhileRevalidate(req));
  else if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.gstatic.com') e.respondWith(cacheFirst(req));
  else if (url.hostname === 'fonts.googleapis.com') e.respondWith(staleWhileRevalidate(req));
});

const keep = async (req, res) => {
  if (res && res.status === 200) (await caches.open(VERSION)).put(req, res.clone());
  return res;
};
async function networkFirst(req) {
  try {
    return await keep(req, await fetch(req));
  } catch {
    return (await caches.match(req)) || (await caches.match('./')) || Response.error();
  }
}
async function cacheFirst(req) {
  return (await caches.match(req)) || keep(req, await fetch(req));
}
async function staleWhileRevalidate(req) {
  const cached = await caches.match(req);
  const fresh = fetch(req).then((res) => keep(req, res)).catch(() => null);
  return cached || (await fresh) || Response.error();
}
// Morceau demandé d’un fichier gardé en entier ; la première fois, le réseau répond et le fichier est gardé pour la suite
async function fromRange(req) {
  const full = await caches.match(req.url);
  if (!full) {
    caches.open(VERSION).then((c) => c.add(req.url)).catch(() => {});
    return fetch(req);
  }
  const buf = await full.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  const start = m && m[1] ? +m[1] : 0, end = m && m[2] ? Math.min(+m[2], size - 1) : size - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}
