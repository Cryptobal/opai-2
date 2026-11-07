/* eslint-disable @typescript-eslint/no-unused-vars -- globales que usa sw-cola.js tras importScripts */
/* OPAI · base local de la cola de Terreno para el service worker (CAR-78 · E1). La carga `importScripts` desde
   sw-cola.js; comparte su ámbito global. Esquema: cola (pendientes), resultados (sincronizado o rechazado con
   motivo) y meta (último intento). Debe coincidir con apps/web/lib/terreno/cola.ts. */
function abrirCola() {
  return new Promise((ok, mal) => {
    const r = indexedDB.open("opai-terreno", 2);
    r.onupgradeneeded = () => {
      const bd = r.result;
      if (!bd.objectStoreNames.contains("cola")) bd.createObjectStore("cola", { keyPath: "clave" });
      if (!bd.objectStoreNames.contains("meta")) bd.createObjectStore("meta");
      if (!bd.objectStoreNames.contains("resultados"))
        bd.createObjectStore("resultados", { keyPath: "clave" });
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
  const resultados = await pedido(db.transaction("resultados").objectStore("resultados").getAll());
  const rechazados = resultados.filter((x) => x.estado === "rechazado").length;
  const estado = { pendientes, intentoEn: Date.now(), rechazados, ...parcial };
  await pedido(db.transaction("meta", "readwrite").objectStore("meta").put(estado, "estado"));
  const ventanas = await self.clients.matchAll({ type: "window" });
  ventanas.forEach((v) => v.postMessage({ type: "COLA", estado }));
}

/** Sincronizados que se conservan para mostrar «ya llegó»; los rechazados no se podan nunca. */
const SINCRONIZADOS_MAX = 100;

/**
 * Pasa hechos de `cola` a `resultados` en UNA transacción confirmada: o quedan pendientes, o quedan resueltos
 * (nunca desaparecen). `res` mapea clave → { estado, motivo }; lo que no tiene resultado sigue pendiente.
 */
async function resolverClaves(db, lote, res) {
  const t = db.transaction(["cola", "resultados"], "readwrite");
  const cola = t.objectStore("cola");
  const salida = t.objectStore("resultados");
  for (const h of lote) {
    const r = res.get(h.clave);
    if (!r) continue;
    cola.delete(h.clave);
    salida.put({
      clave: h.clave,
      tipo: h.tipo,
      horaHecho: h.horaHecho,
      estado: r.estado,
      motivo: r.motivo ?? null,
      resueltoEn: Date.now(),
    });
  }
  await new Promise((ok, mal) => {
    t.oncomplete = ok;
    t.onerror = () => mal(t.error);
    t.onabort = () => mal(t.error);
  });
  await podarSincronizados(db);
}

async function podarSincronizados(db) {
  const todos = await pedido(db.transaction("resultados").objectStore("resultados").getAll());
  const viejos = todos
    .filter((x) => x.estado === "sincronizado")
    .sort((a, b) => b.resueltoEn - a.resueltoEn)
    .slice(SINCRONIZADOS_MAX);
  if (viejos.length === 0) return;
  const t = db.transaction("resultados", "readwrite");
  viejos.forEach((x) => t.objectStore("resultados").delete(x.clave));
  await new Promise((ok) => {
    t.oncomplete = ok;
    t.onerror = ok;
  });
}

/** Equipo revocado: se descarta la cola con aviso (decisión de Carlos, 6-nov-2026). */
async function descartarTodo(db, claves) {
  const t = db.transaction("cola", "readwrite");
  claves.forEach((c) => t.objectStore("cola").delete(c));
  await new Promise((ok, mal) => {
    t.oncomplete = ok;
    t.onerror = () => mal(t.error);
  });
}
