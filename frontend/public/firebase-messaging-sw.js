/**
 * Kill-switch Service Worker.
 * À déposer à toutes les URLs où d'anciens projets pouvaient avoir enregistré
 * un SW (sw.js, service-worker.js, workbox-sw.js, firebase-messaging-sw.js).
 *
 * Quand un navigateur déjà infecté par un vieux SW vérifie son SW (toutes les
 * 24h max, ou à chaque navigation), il télécharge ce fichier, le compare au
 * cached SW, voit qu'il est différent → install + activate du nouveau →
 * exécute le nettoyage : vide tous les caches, désinscrit le SW, force reload.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (_) {}

      try {
        await self.registration.unregister();
      } catch (_) {}

      try {
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        clients.forEach((c) => {
          try {
            c.navigate(c.url);
          } catch (_) {}
        });
      } catch (_) {}
    })()
  );
});

self.addEventListener("fetch", () => {
  // No-op : on ne sert plus rien depuis le SW. Les requêtes passent direct au réseau.
});
