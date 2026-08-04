const CACHE = 'sakura-v19';
const ASSETS = [
  './db.json',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // POST等（保存・下書き送信・GAS通信）はキャッシュ処理を一切挟まず素通りさせる。
  // caches.match()がリクエストボディに触れると、iOS Safari等で後続のfetch()が
  // 「Failed to fetch」で失敗する既知の問題があり、保存ボタンの通信エラーの原因になるため。
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  // index.html は常にネットワーク優先（キャッシュは使わない）
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // その他はキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
