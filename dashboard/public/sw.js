// Minimal service worker. Network-first for navigations/data (never serve stale
// HTML), cache-first only for immutable hashed assets. Versioned cache so an
// updated worker drops the old one on activate. Same-origin only.
const CACHE = "f1dash-v2";
const PRECACHE = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.catch(() => undefined)
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => self.clients.claim()),
	);
});

function isImmutable(pathname) {
	return pathname.startsWith("/_next/static/") || /\.(svg|png|ico|woff2?)$/.test(pathname);
}

self.addEventListener("fetch", (event) => {
	const request = event.request;
	if (request.method !== "GET") return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return; // leave cross-origin untouched

	if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
		event.respondWith(fetch(request));
		return;
	}

	if (isImmutable(url.pathname)) {
		event.respondWith(
			caches.open(CACHE).then(async (cache) => {
				const hit = await cache.match(request);
				if (hit) return hit;
				const response = await fetch(request);
				if (response.ok) cache.put(request, response.clone());
				return response;
			}),
		);
		return;
	}

	event.respondWith(
		(async () => {
			try {
				const response = await fetch(request);
				if (response.ok && request.mode === "navigate") {
					const cache = await caches.open(CACHE);
					cache.put(request, response.clone());
				}
				return response;
			} catch (error) {
				const cache = await caches.open(CACHE);
				const hit = (await cache.match(request)) || (request.mode === "navigate" ? await cache.match("/") : undefined);
				if (hit) return hit;
				throw error;
			}
		})(),
	);
});
