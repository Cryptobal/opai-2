/* OPAI · cola de Terreno del service worker (CAR-78 · B3). La carga `importScripts` desde sw.js (que sigue
   siendo el único script registrado); comparte su ámbito global. */
/* Cola de hechos de Terreno (CAR-78 · B3, ADR-044 punto 3). Lo que el equipo captura sin señal queda en
   IndexedDB ("opai-terreno") y se envía en lote a /api/terreno/lote con la cookie del dispositivo. Cada
   hecho viaja con su `clave` (uuid): reenviar es seguro y llega una sola vez. Aquí no se guarda nada en las
   cachés ni se toca al cerrar sesión: los hechos pendientes sobreviven. Equipo revocado (401): se descartan.
   Red caída, 429 o 5xx: se conservan y el navegador reintenta (Background Sync con espera creciente) o la
   página vuelve a pedirlo. E1: nada se borra en silencio. Lo que el servidor resuelve pasa de `cola` a
   `resultados` en UNA transacción (sincronizado, o rechazado con su motivo); un lote mal formado (422) se
   marca rechazado «lote_invalido». Los rechazados quedan hasta que la persona los descarta. */
importScripts("/sw-cola-bd.js");
/* global importScripts, abrirCola, pedido, avisarCola, resolverClaves, descartarTodo */
const SYNC_TAG = "opai-terreno-lote";
const LOTE_MAX = 50;

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
        const res = new Map(
          d.resultados.map((x) => [
            x.clave,
            { estado: x.estado === "rechazado" ? "rechazado" : "sincronizado", motivo: x.motivo },
          ]),
        );
        await resolverClaves(db, lote, res);
        await avisarCola(db, { ok: true, desfaseSegundos: d.desfaseSegundos });
        // Nada resuelto en este lote (respuesta sin sus claves): no se reintenta en bucle.
        if (!lote.some((h) => res.has(h.clave))) return;
        continue;
      }
      if (r.status === 401) {
        const d = await r.json().catch(() => ({}));
        if (d.revocado) await descartarTodo(db, todos.map((h) => h.clave));
        await avisarCola(db, { ok: false, error: d.revocado ? "revocado" : "sin_dispositivo" });
        return;
      }
      if (r.status === 422) {
        await resolverClaves(
          db,
          lote,
          new Map(claves.map((c) => [c, { estado: "rechazado", motivo: "lote_invalido" }])),
        );
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
