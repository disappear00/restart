const CACHE_NAME = "portfolio-lab-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles/base.css",
  "./src/main.js",
  "./src/router.js",
  "./src/theme.js",
  "./src/i18n.js",
  "./src/utils.js",
  "./src/state.js",
  "./src/components/header.js",
  "./src/components/modal.js",
  "./src/components/toast.js",
  "./src/components/chatbot.js",
  "./src/components/backToTop.js",
  "./src/components/cursor.js",
  "./src/components/lazyMedia.js",
  "./src/data/projects.js",
  "./src/data/fallback-translations.js",
  "./src/routes/home.js",
  "./src/routes/about.js",
  "./src/routes/projects.js",
  "./src/routes/contact.js",
  "./styles/routes/home.css",
  "./styles/routes/about.css",
  "./styles/routes/projects.css",
  "./styles/routes/contact.css",
  "./locales/zh.json",
  "./locales/en.json",
  "./assets/icon.svg",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
