const scope = self.registration.scope;
const cachePrefix = "unit-water:" + scope + ":";
const cacheName = cachePrefix + "saved-settings-v1";
const indexURL = new URL("index.html", scope).href;
const appFiles = new Set([
  "index.html",
  "manifest.webmanifest",
  "apple-touch-icon-v2.png",
  "icon-v2.svg",
  "icon-v2-192.png",
  "icon-v2-512.png",
  "water-core.js",
  "water-ui.js",
  "register-sw.js"
].map((file) => new URL(file, scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll([...appFiles])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const oldNames = names.filter((name) => name.startsWith(cachePrefix) && name !== cacheName);
    await Promise.all(oldNames.map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  url.search = "";
  const key = request.mode === "navigate" && url.href === scope ? indexURL : url.href;
  if (!appFiles.has(key)) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return (await cache.match(key)) ?? fetch(request);
  })());
});
