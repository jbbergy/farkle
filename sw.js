// Service worker du Farkle : le jeu s’installe comme une application et se lance sans réseau une fois visité.
// - La page, sa feuille de style et ses modules (css/, js/) : le réseau d’abord, pour recevoir une nouvelle version
//   tout entière (un module ancien avec une page nouvelle casserait le jeu), la copie gardée si le réseau manque.
// - Three.js, cannon-es (versions figées sur cdn.jsdelivr.net) et les fichiers des polices : gardés une fois pour toutes.
// - Les sons (musique comprise) et la feuille des polices : servis depuis la copie gardée, rafraîchie en arrière-plan.
// Changer VERSION quand les listes ci-dessous changent : l’ancienne copie est alors effacée.
// Un fichier ajouté dans css/ ou js/ doit être ajouté à CODE (deploy.sh le vérifie), sinon le jeu ne se lance pas hors connexion.
const VERSION = 'farkle-3';
const SHELL = ['./', 'manifest.webmanifest', 'icons/icone.svg', 'icons/icone-192.png', 'icons/icone-512.png', 'icons/icone-apple.png'];
const CODE = [
  'css/style.css',
  'js/main.js', 'js/config.js', 'js/outils.js', 'js/des-speciaux.js', 'js/adversaires.js', 'js/bourse.js', 'js/repliques.js',
  'js/textures.js', 'js/scene.js', 'js/decor.js', 'js/physique.js', 'js/des.js', 'js/lancer.js', 'js/regles.js',
  'js/carnet.js', 'js/sauvegarde.js', 'js/partie.js', 'js/ia.js', 'js/sons.js', 'js/vibreur.js', 'js/voix.js', 'js/cadrage.js', 'js/entrees.js',
  'js/ui/parchemin.js', 'js/ui/icones.js', 'js/ui/hud.js', 'js/ui/page-regles.js', 'js/ui/echoppe.js', 'js/ui/page-carnet.js',
  'js/ui/menu.js', 'js/ui/reglages.js',
];
const LIBS = [
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js',
  'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll([...SHELL, ...CODE, ...LIBS])).then(() => self.skipWaiting()));
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
  if (req.mode === 'navigate') e.respondWith(networkFirst(req, './'));
  else if (url.origin === location.origin && /\.(js|css)$/.test(url.pathname)) e.respondWith(networkFirst(req));
  else if (url.origin === location.origin) e.respondWith(staleWhileRevalidate(req));
  else if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.gstatic.com') e.respondWith(cacheFirst(req));
  else if (url.hostname === 'fonts.googleapis.com') e.respondWith(staleWhileRevalidate(req));
});

const keep = async (req, res) => {
  if (res && res.status === 200) (await caches.open(VERSION)).put(req, res.clone());
  return res;
};
// `fallback` : copie de secours (la page d’accueil pour une adresse du site qui n’a pas été gardée)
async function networkFirst(req, fallback = null) {
  try {
    return await keep(req, await fetch(req));
  } catch {
    return (await caches.match(req)) || (fallback && (await caches.match(fallback))) || Response.error();
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
