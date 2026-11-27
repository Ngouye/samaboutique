// Service worker de SamaBoutik : permet d'installer le site comme une application (Android, ordinateur).
// Il ne garde rien en cache : chaque page vient du réseau, donc rien de périmé après une mise en ligne.
// Sans connexion, une page simple « Pas de connexion » remplace l'erreur du navigateur.
const OFFLINE_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0c0a24">
<title>Pas de connexion · SamaBoutik</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;
    background: radial-gradient(60% 50% at 80% 0%, rgba(106, 88, 232, 0.5), transparent 70%), #0c0a24;
    color: #fff; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; text-align: center; }
  h1 { font-size: 22px; margin: 18px 0 8px; }
  p { color: rgba(255, 255, 255, 0.65); margin: 0 0 22px; line-height: 1.5; }
  a { display: inline-block; text-decoration: none; background: linear-gradient(100deg, #f9d784, #f3a953 55%, #ec8a5a);
    color: #1a1033; border-radius: 999px; padding: 13px 24px; font-weight: 800; font-size: 15px; }
  .icon { width: 64px; height: 64px; margin: 0 auto; border-radius: 20px; background: rgba(255, 255, 255, 0.08);
    display: flex; align-items: center; justify-content: center; font-size: 30px; }
</style>
</head>
<body>
  <main>
    <div class="icon" aria-hidden="true">📶</div>
    <h1>Pas de connexion internet</h1>
    <p>Vérifiez votre connexion (données mobiles ou Wi-Fi),<br>puis réessayez.</p>
    <a href="">Réessayer</a>
  </main>
</body>
</html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  // Seulement l'ouverture des pages : les images, scripts et appels à l'API passent sans intermédiaire.
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
  );
});
