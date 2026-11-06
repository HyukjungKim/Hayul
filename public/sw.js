// 앱 화면은 항상 서버에서 최신으로 받고(안 되면 저장해 둔 것으로 열어요), 아이콘·글꼴 같은 파일은 저장해 둔 것을 먼저 써요
const CACHE = 'hayul-closet-v13';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
const keep = (req, res) => { if (res.ok && res.type === 'basic' || req.url.includes('fonts.g')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return; // 옷장 데이터는 항상 서버에서
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith(fetch(req).then(res => keep(req, res)).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => keep(req, res))));
});
