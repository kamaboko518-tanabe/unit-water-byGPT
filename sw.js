const scope = self.registration.scope;
const cachePrefix = "unit-water:" + scope + ":";
const cacheName = cachePrefix + "saved-settings-v2";
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
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    // HTTPキャッシュを使わず、常に最新ファイルを取得して保存する
    await Promise.all([...appFiles].map(async (url) => {
      const response = await fetch(new Request(url, { cache: "reload" }));
      if (!response.ok) throw new Error("cache failed: " + url);
      await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const oldNames = names.filter((name) => name.startsWith(cachePrefix) && name !== cacheName);
    await Promise.all(oldNames.map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

// 電波があれば最新版を取得（更新が反映される）。圏外・低速(3秒超)なら保存済みを使う。
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  url.search = "";
  const key = request.mode === "navigate" && url.href === scope ? indexURL : url.href;
  if (!appFiles.has(key)) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(key);
    const network = fetch(key, { cache: "no-cache" }).then((response) => {
      if (response.ok) cache.put(key, response.clone());
      return response;
    });
    event.waitUntil(network.catch(() => {}));
    if (!cached) return network;
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
    try {
      return (await Promise.race([network, timeout])) || cached;
    } catch {
      return cached;
    }
  })());
});
