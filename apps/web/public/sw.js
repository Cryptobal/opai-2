/* OPAI · service worker base (ADR-044, Brief 04; D2 b: propio y sin dependencias).
   - Precachea solo la página sin conexión (/sin-conexion), que no lleva datos de ningún tenant.
   - Navegación de documento: network-first con respaldo a la página sin conexión.
   - Estáticos con hash (/_next/static): cache-first, para que la segunda carga no descargue JS (R6).
   - Nunca cachea /api/* ni datos de negocio; no guarda HTML con sesión, así que cerrar sesión no
     muestra nada cacheado (R4, §9, CA8).
   - Actualización controlada: el service worker nuevo queda en espera y solo hace skipWaiting
     cuando la app lo pide por mensaje (R2). */
const VERSION = "v1";
const CACHE = `opai-${VERSION}`;
const OFFLINE = "/sin-conexion";

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)));
  // Sin skipWaiting aquí: el nuevo service worker espera a que la persona acepte (R2).
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const claves = await caches.keys();
      await Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (evento) => {
  if (evento.data && evento.data.type === "SKIP_WAITING") self.skipWaiting();
});

async function cacheFirst(request) {
  const guardado = await caches.match(request);
  if (guardado) return guardado;
  const respuesta = await fetch(request);
  if (respuesta.ok) (await caches.open(CACHE)).put(request, respuesta.clone());
  return respuesta;
}

async function navegacion(request) {
  try {
    // Seguimos los redirects (login → /, Server Actions → 303) y reconstruimos: devolver una
    // respuesta "redirected" u "opaqueredirect" a una navegación (redirect "manual") la rompe.
    const res = await fetch(request.url, {
      headers: request.headers,
      credentials: "same-origin",
      redirect: "follow",
    });
    if (!res.redirected) return res;
    // `fetch` ya decodificó el cuerpo; copiar content-encoding/length haría que el navegador lo
    // decodifique de nuevo. Se quitan al reconstruir.
    const headers = new Headers(res.headers);
    headers.delete("content-encoding");
    headers.delete("content-length");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  } catch {
    const offline = await caches.match(OFFLINE);
    return offline ?? Response.error();
  }
}

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Nunca datos de negocio: /api/* va directo a la red (R4, §9).
  if (url.pathname.startsWith("/api/")) return;
  // Estáticos con hash: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    evento.respondWith(cacheFirst(request));
    return;
  }
  // Navegación de documento: network-first con respaldo a la página sin conexión.
  if (request.mode === "navigate") {
    evento.respondWith(navegacion(request));
  }
  // RSC, datos y el resto: red directa, sin caché (la frescura y la seguridad quedan en el servidor).
});
