// Minimale service worker: maakt de app installeerbaar en vangt offline
// bezoeken op met een nette melding. Caching-strategie wordt verfijnd in
// fase 8 (PWA-afwerking).

const CACHE = "morning-report-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // succesvolle pagina's cachen voor offline terugval
        if (response.ok && event.request.mode === "navigate") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((hit) => hit ?? offlineFallback())),
  );
});

function offlineFallback() {
  return new Response(
    "<html lang='nl'><body style='font-family:sans-serif;text-align:center;padding-top:4rem'>" +
      "<h1>Offline</h1><p>Geen verbinding — je laatste editie staat in de cache zodra je er één bekeken hebt.</p>" +
      "</body></html>",
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
