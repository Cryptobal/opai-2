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
// Activos públicos, sin datos de ningún tenant. Los íconos los declara el manifest y la meta.
const PRECACHE = [
  OFFLINE,
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
    const offline = await caches.match(OFFLINE);
    return offline ?? Response.error();
  }
}

/* Cola de hechos de Terreno (CAR-78 · B3, ADR-044 punto 3). Lo que el equipo captura sin señal queda en
   IndexedDB ("opai-terreno") y se envía en lote a /api/terreno/lote con la cookie del dispositivo. Cada
   hecho viaja con su `clave` (uuid): reenviar es seguro y llega una sola vez. Aquí no se guarda nada en las
   cachés ni se toca al cerrar sesión: los hechos pendientes sobreviven. Equipo revocado (401): se descartan.
   Red caída, 429 o 5xx: se conservan y el navegador reintenta (Background Sync con espera creciente) o la
   página vuelve a pedirlo. Lote mal formado (422): se descarta para no bloquear a los demás. */
const SYNC_TAG = "opai-terreno-lote";
const LOTE_MAX = 50;

function abrirCola() {
  return new Promise((ok, mal) => {
    const r = indexedDB.open("opai-terreno", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("cola", { keyPath: "clave" });
      r.result.createObjectStore("meta");
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}
const pedido = (req) =>
  new Promise((ok, mal) => {
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });

async function avisarCola(db, parcial) {
  const pendientes = await pedido(db.transaction("cola").objectStore("cola").count());
  const estado = { pendientes, intentoEn: Date.now(), ...parcial };
  await pedido(db.transaction("meta", "readwrite").objectStore("meta").put(estado, "estado"));
  const ventanas = await self.clients.matchAll({ type: "window" });
  ventanas.forEach((v) => v.postMessage({ type: "COLA", estado }));
}

async function borrarClaves(db, claves) {
  const t = db.transaction("cola", "readwrite");
  claves.forEach((c) => t.objectStore("cola").delete(c));
  await new Promise((ok, mal) => {
    t.oncomplete = ok;
    t.onerror = () => mal(t.error);
  });
}

let vaciando = null;
function vaciarCola() {
  if (!vaciando) {
    vaciando = vaciarUnaVez().finally(() => {
      vaciando = null;
    });
  }
  return vaciando;
}

async function vaciarUnaVez() {
  const db = await abrirCola();
  try {
    for (;;) {
      const todos = await pedido(db.transaction("cola").objectStore("cola").getAll());
      if (todos.length === 0) return avisarCola(db, { ok: true });
      todos.sort((a, b) => a.creadoEn - b.creadoEn);
      const lote = todos.slice(0, LOTE_MAX);
      const claves = lote.map((h) => h.clave);
      let r;
      try {
        r = await fetch("/api/terreno/lote", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            horaEnvio: new Date().toISOString(),
            hechos: lote.map(({ clave, tipo, payload, personaId, horaHecho }) => ({
              clave,
              tipo,
              payload,
              personaId,
              horaHecho,
            })),
          }),
        });
      } catch {
        await avisarCola(db, { ok: false, error: "sin_red" });
        throw new Error("sin red"); // El navegador reintenta el sync con espera creciente.
      }
      if (r.status === 200) {
        const d = await r.json();
        await borrarClaves(db, claves);
        const rechazados = d.resultados.filter((x) => x.estado === "rechazado").length;
        await avisarCola(db, { ok: true, desfaseSegundos: d.desfaseSegundos, rechazados });
        continue;
      }
      if (r.status === 401) {
        const d = await r.json().catch(() => ({}));
        if (d.revocado) await borrarClaves(db, todos.map((h) => h.clave));
        await avisarCola(db, { ok: false, error: d.revocado ? "revocado" : "sin_dispositivo" });
        return;
      }
      if (r.status === 422) {
        await borrarClaves(db, claves);
        await avisarCola(db, { ok: false, error: "lote_descartado" });
        continue;
      }
      await avisarCola(db, { ok: false, error: "servidor_" + r.status });
      throw new Error("servidor " + r.status);
    }
  } finally {
    db.close();
  }
}

self.addEventListener("sync", (evento) => {
  if (evento.tag === SYNC_TAG) evento.waitUntil(vaciarCola());
});

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
