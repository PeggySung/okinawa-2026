// 離線快取：網頁本身先試網路、沒網路用快取；圖片、字體、Firebase 程式庫用快取
const VERSION = 'rlc-v15';
const IMG_CACHE = 'rlc-card-img'; // 銀行官網卡面圖片（跨版本保留）
const SHELL = ['./', './index.html', './firebase-config.js', './manifest.webmanifest',
  './img/icon-192.png', './img/apple-touch-icon.png', './img/hero.webp',
  './img/qi.webp', './img/xuan.webp', './img/yun.webp', './img/yue.webp'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== IMG_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isLib = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  // 銀行官網的卡面圖片：先用快取，沒有才上網抓（離線時也看得到看過的卡面）
  if (!sameOrigin && req.destination === 'image') {
    e.respondWith(caches.open(IMG_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }))));
    return;
  }
  if (!sameOrigin && !isLib && !isFont) return; // Firestore、登入等請求不經過快取
  const isPage = sameOrigin && (req.mode === 'navigate' || /\.(html|js|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/'));
  if (isPage) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
      return r;
    })));
  }
});
