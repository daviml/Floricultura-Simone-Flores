// Service worker simples: deixa o app instalável e abre mesmo com internet ruim.
// Sempre tenta a rede primeiro; o cache é só reserva.
const CACHE = 'sf-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const ehFoto = url.pathname === '/api/foto';
  if (url.pathname.startsWith('/api/') && !ehFoto) return;
  e.respondWith(
    (ehFoto ? caches.match(req) : Promise.resolve(null)).then(
      (salvo) =>
        salvo ||
        fetch(req)
          .then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          })
          .catch(() => caches.match(req)),
    ),
  );
});
