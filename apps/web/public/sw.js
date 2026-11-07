/* global vaciarCola */
/* OPAI · service worker base (ADR-044, Brief 04; D2 b: propio y sin dependencias).
   - Precache: una LISTA EXPLÍCITA de activos públicos (la página offline neutra y los íconos). Nunca
     HTML ni RSC con sesión, ni un patrón amplio (§4.4, CA8). El HTML y el RSC llevan datos de la
     persona y del tenant (nombre, correo, empresa y membresías del shell, datos-shell.ts): van solo
     por red, igual que /api/* y cualquier dato (R4, §9).
   - Los JS/CSS con hash entran a esa misma caché por cache-first bajo el prefijo explícito
     /_next/static/ (no se pueden enumerar aquí: su hash nace del build), igual que las fuentes de
     next/font (/_next/static/media). Así la segunda carga no descarga JS (R6).
   - Navegación de documento: network-first con respaldo a la página offline neutra.
   - Al cerrar sesión o cambiar de empresa, la app pide por mensaje (LIMPIAR_SESION, limpiar-cache.ts)
     borrar estas cachés y re-precachear los activos públicos, antes de redirigir; aquí no se guarda
     nada con sesión, así que no queda nada del tenant anterior y el cascarón offline sigue disponible.
   - Actualización controlada: el service worker nuevo queda en espera y solo hace skipWaiting
     cuando la app lo pide por mensaje (R2). */
const VERSION = "v1";
const CACHE = `opai-${VERSION}`;
const OFFLINE = "/sin-conexion";
// Terreno sin señal: página neutra (sin personas ni datos de la empresa) que solo lee la cola del teléfono.
const OFFLINE_TERRENO = "/terreno/sin-conexion";
// Activos públicos, sin datos de ningún tenant. Los íconos los declara el manifest y la meta.
const PRECACHE = [
  OFFLINE,
  OFFLINE_TERRENO,
  "/icono-192.png",
  "/icono-512.png",
  "/icono-maskable-192.png",
  "/icono-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
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
  const data = evento.data;
  if (!data) return;
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  // La página pide enviar la cola de Terreno ahora (volvió la señal, abrió la app o «Reintentar ahora»).
  if (data.type === "VACIAR_COLA") {
    evento.waitUntil(vaciarCola().catch(() => undefined));
    return;
  }
  // Al cerrar sesión o cambiar de empresa, la app pide borrar TODAS las cachés (defensa en
  // profundidad, §4.4, §9, CA8) y dejar solo la lista explícita de activos públicos. Como esos
  // activos NO llevan datos de sesión, se rescatan los que ya estaban guardados ANTES de borrar y se
  // vuelven a poner después: así el cascarón offline sigue disponible aunque se salga sin red (en
  // terreno la red es intermitente). Con red, el addAll los refresca; el ack se envía al terminar.
  if (data.type === "LIMPIAR_SESION") {
    evento.waitUntil(
      (async () => {
        const previo = await caches.open(CACHE);
        const rescatados = await Promise.all(
          PRECACHE.map(async (u) => [u, await previo.match(u)]),
        );
        const claves = await caches.keys();
        await Promise.all(claves.map((k) => caches.delete(k)));
        const fresca = await caches.open(CACHE);
        await Promise.all(
          rescatados.map(([u, r]) => (r ? fresca.put(u, r.clone()) : Promise.resolve())),
        );
        try {
          await fresca.addAll(PRECACHE); // Refresca desde la red si la hay; si no, quedan los rescatados.
        } catch {
          // Sin red al salir: se conservan los activos públicos rescatados.
        }
        evento.ports[0]?.postMessage({ ok: true });
      })(),
    );
  }
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
    // Se devuelve la respuesta del fetch TAL CUAL: para una navegación, el navegador sigue el
    // redirect del servidor (sin sesión → /login; /entrar de D1 → el portal; Server Actions → 303) y
    // deja la barra de direcciones en el destino. Reconstruir la respuesta perdía esa redirección y
    // el navegador se quedaba en la URL de origen (rompía la salida y el /entrar de D1).
    return await fetch(request);
  } catch {
    const esTerreno = new URL(request.url).pathname.startsWith("/terreno");
    const offline = await caches.match(esTerreno ? OFFLINE_TERRENO : OFFLINE);
    return offline ?? (esTerreno ? await caches.match(OFFLINE) : null) ?? Response.error();
  }
}

importScripts("/sw-cola.js");


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
