// Service worker de la Dog Compagnie — volontairement minimal.
// Objectif : rendre le site installable et afficher la dernière version connue si le réseau
// tombe. Il ne met JAMAIS en cache les données (Supabase) ni les ressources externes.
const CACHE = "dog-compagnie-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // Supabase, polices, CDN : jamais touchés
  if (url.search) return;                                    // liens à usage unique (?test_login=, ?carte=) : jamais en cache

  // Pages : réseau d'abord (toujours la version à jour), cache seulement si hors ligne
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match("./")))
    );
    return;
  }
  // Icônes et manifeste : cache d'abord, mis à jour en arrière-plan
  e.respondWith(
    caches.match(req).then(cached => {
      const refresh = fetch(req).then(res => { caches.open(CACHE).then(c => c.put(req, res.clone())); return res; }).catch(() => cached);
      return cached || refresh;
    })
  );
});
