/* First n Last offline support.
   - The game page: always tries the network first (so updates show up right away); only when there is
     no connection does it open the copy saved on the phone.
   - Pictures (their addresses carry the build number): saved on install, served from the phone.
   - Fonts and the Firebase scripts: saved the first time they load.
   - Never touched: version.txt (the update check), the intro film, the admin page, Firebase live data. */
const BUILD = '20261114141616';
const CACHE = 'fnl-' + BUILD, EXT = 'fnl-ext';
const SCOPE = new URL('./', self.location).href;
const CORE = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "img/balloon.webp?v=20261114141616", "img/band.webp?v=20261114141616", "img/bg.webp?v=20261114141616", "img/block.webp?v=20261114141616", "img/capy_b1.webp?v=20261114141616", "img/capy_b2.webp?v=20261114141616", "img/capy_b3.webp?v=20261114141616", "img/capy_b4.webp?v=20261114141616", "img/capy_b5.webp?v=20261114141616", "img/capy_b6.webp?v=20261114141616", "img/capy_b7.webp?v=20261114141616", "img/capy_b8.webp?v=20261114141616", "img/capy_f1.webp?v=20261114141616", "img/capy_f2.webp?v=20261114141616", "img/capy_f3.webp?v=20261114141616", "img/capy_f4.webp?v=20261114141616", "img/capy_f5.webp?v=20261114141616", "img/capy_f6.webp?v=20261114141616", "img/capy_f7.webp?v=20261114141616", "img/capy_f8.webp?v=20261114141616", "img/capy_p0.webp?v=20261114141616", "img/capy_p1.webp?v=20261114141616", "img/capy_p2.webp?v=20261114141616", "img/capy_s.webp?v=20261114141616", "img/cast_capy.webp?v=20261114141616", "img/cast_capy34.webp?v=20261114141616", "img/cast_capy34_pc.webp?v=20261114141616", "img/cast_capy_up.webp?v=20261114141616", "img/cast_panda.webp?v=20261114141616", "img/cast_panda34.webp?v=20261114141616", "img/hammer.webp?v=20261114141616", "img/hillfg.webp?v=20261114141616", "img/homecast.webp?v=20261114141616", "img/logo.webp?v=20261114141616", "img/panda_b1.webp?v=20261114141616", "img/panda_b2.webp?v=20261114141616", "img/panda_b3.webp?v=20261114141616", "img/panda_b4.webp?v=20261114141616", "img/panda_b5.webp?v=20261114141616", "img/panda_b6.webp?v=20261114141616", "img/panda_b7.webp?v=20261114141616", "img/panda_b8.webp?v=20261114141616", "img/panda_f1.webp?v=20261114141616", "img/panda_f2.webp?v=20261114141616", "img/panda_f3.webp?v=20261114141616", "img/panda_f4.webp?v=20261114141616", "img/panda_f5.webp?v=20261114141616", "img/panda_f6.webp?v=20261114141616", "img/panda_f7.webp?v=20261114141616", "img/panda_f8.webp?v=20261114141616", "img/panda_p0.webp?v=20261114141616", "img/panda_p1.webp?v=20261114141616", "img/panda_p2.webp?v=20261114141616", "img/panda_s.webp?v=20261114141616", "img/plat.webp?v=20261114141616", "img/tileA.webp?v=20261114141616", "img/tileQ.webp?v=20261114141616", "img/vs.webp?v=20261114141616"];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => { })))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('fnl-') && k !== CACHE && k !== EXT).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const isPage = u => u.origin === location.origin && (u.href.split(/[?#]/)[0] === SCOPE || u.href.split(/[?#]/)[0] === SCOPE + 'index.html');
function timeout(ms) { return new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms)); }

self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  /* the game page: network first, saved copy when offline or very slow */
  if (r.mode === 'navigate') {
    if (!isPage(u)) return;
    e.respondWith(Promise.race([fetch(r), timeout(6000)]).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(SCOPE, copy)); }
      return res;
    }).catch(() => caches.match(SCOPE).then(hit => hit || fetch(r))));
    return;
  }
  if (u.origin === location.origin) {
    const p = u.pathname;
    if (p.endsWith('/version.txt') || p.endsWith('.mp4') || p.includes('/admin/') || p.endsWith('/sw.js')) return;
    /* exact copy first; offline, any saved copy of the same file */
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(h => h || Response.error()))));
    return;
  }
  /* fonts and Firebase scripts: saved once, reused (the font list refreshes in the background) */
  const host = u.hostname;
  if (host === 'fonts.gstatic.com' || (host === 'cdn.jsdelivr.net' && u.pathname.startsWith('/npm/firebase@'))) {
    e.respondWith(caches.open(EXT).then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }))));
    return;
  }
  if (host === 'fonts.googleapis.com') {
    e.respondWith(caches.open(EXT).then(c => c.match(r).then(hit => {
      const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
