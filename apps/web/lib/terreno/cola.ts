import { esTipoEncolable } from "@opai/domain/terreno-hechos";

import {
  type EstadoEnvio,
  type HechoLocal,
  PersistenciaNoVerificada,
  type ResultadoLocal,
  type ResumenCola,
  TipoNoEncolable,
} from "./cola-tipos";

export * from "./cola-tipos";

/**
 * Cola local de hechos de Terreno (CAR-78 · B3 y E1, ADR-044 punto 3). Vive en IndexedDB ("opai-terreno") y la
 * envía el service worker (`public/sw-cola.js`) a /api/terreno/lote. El esquema debe coincidir con el del SW.
 *
 * Tres estados visibles para la persona (E1): **pendiente** (en `cola`, aún no llegó), **sincronizado** y
 * **rechazado** (en `resultados`, con el motivo del servidor). Un hecho rechazado no se pierde en silencio:
 * queda hasta que alguien lo descarta. Nunca se dice «guardado» sin haber releído el hecho del disco.
 */
export const NOMBRE_BD = "opai-terreno";
export const VERSION_BD = 2;
export const ETIQUETA_SYNC = "opai-terreno-lote";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(NOMBRE_BD, VERSION_BD);
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

const pedido = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((ok, mal) => {
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });

/** Espera a que la transacción quede CONFIRMADA en disco (no solo a que el pedido se acepte). */
const confirmada = (t: IDBTransaction): Promise<void> =>
  new Promise((ok, mal) => {
    t.oncomplete = () => ok();
    t.onerror = () => mal(t.error);
    t.onabort = () => mal(t.error ?? new Error("transacción abortada"));
  });

/** Pide al service worker enviar la cola: Background Sync si existe (reintenta solo) y mensaje directo. */
export async function pedirEnvio(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  try {
    await (
      reg as ServiceWorkerRegistration & { sync?: { register(t: string): Promise<void> } }
    ).sync?.register(ETIQUETA_SYNC);
  } catch {
    // Sin Background Sync (Safari): basta el mensaje.
  }
  if (navigator.onLine) reg.active?.postMessage({ type: "VACIAR_COLA" });
}

/**
 * Guarda un hecho en el teléfono, comprueba que quedó (confirma la transacción y lo relee) y recién entonces
 * pide enviarlo. La hora del hecho es la del reloj del equipo. Falla con `TipoNoEncolable` o
 * `PersistenciaNoVerificada`: quien llama NO debe mostrar éxito si lanza.
 */
export async function encolarHecho(h: {
  tipo: string;
  payload: unknown;
  personaId?: string | null;
}): Promise<{ clave: string }> {
  if (!esTipoEncolable(h.tipo)) throw new TipoNoEncolable(h.tipo);
  const hecho: HechoLocal = {
    clave: crypto.randomUUID(),
    tipo: h.tipo,
    payload: h.payload,
    personaId: h.personaId ?? null,
    horaHecho: new Date().toISOString(),
    creadoEn: Date.now(),
  };
  const db = await abrir();
  try {
    const t = db.transaction("cola", "readwrite");
    t.objectStore("cola").put(hecho);
    await confirmada(t);
    const releido = await pedido(db.transaction("cola").objectStore("cola").get(hecho.clave));
    if (!releido || releido.clave !== hecho.clave) throw new PersistenciaNoVerificada();
  } catch (e) {
    throw e instanceof PersistenciaNoVerificada ? e : new PersistenciaNoVerificada();
  } finally {
    db.close();
  }
  // Almacenamiento persistente: pide que el navegador no lo borre bajo presión de espacio (mejor esfuerzo).
  void navigator.storage?.persist?.().catch(() => undefined);
  await pedirEnvio();
  return { clave: hecho.clave };
}

export async function leerCola(): Promise<HechoLocal[]> {
  return (await leerResumen()).pendientes;
}

/** Los tres estados de lo capturado en este teléfono, del más nuevo al más antiguo en los ya resueltos. */
export async function leerResumen(): Promise<ResumenCola> {
  const db = await abrir();
  try {
    const [cola, res] = await Promise.all([
      pedido<HechoLocal[]>(db.transaction("cola").objectStore("cola").getAll()),
      pedido<ResultadoLocal[]>(db.transaction("resultados").objectStore("resultados").getAll()),
    ]);
    const nuevos = res.sort((a, b) => b.resueltoEn - a.resueltoEn);
    return {
      pendientes: cola.sort((a, b) => a.creadoEn - b.creadoEn),
      sincronizados: nuevos.filter((r) => r.estado === "sincronizado"),
      rechazados: nuevos.filter((r) => r.estado === "rechazado"),
    };
  } finally {
    db.close();
  }
}

/** Quita de la lista un hecho rechazado que la persona ya vio (no hay nada más que hacer con él). */
export async function descartarRechazado(clave: string): Promise<void> {
  const db = await abrir();
  try {
    const t = db.transaction("resultados", "readwrite");
    t.objectStore("resultados").delete(clave);
    await confirmada(t);
  } finally {
    db.close();
  }
}

export async function leerEstadoEnvio(): Promise<EstadoEnvio | null> {
  const db = await abrir();
  try {
    return (
      (await pedido<EstadoEnvio | undefined>(
        db.transaction("meta").objectStore("meta").get("estado"),
      )) ?? null
    );
  } finally {
    db.close();
  }
}

/** Equipo revocado: borra la cola y su estado de este teléfono (lo que el servidor ya no aceptaría). */
export function borrarColaLocal(): Promise<void> {
  return new Promise((ok) => {
    const r = indexedDB.deleteDatabase(NOMBRE_BD);
    r.onsuccess = r.onerror = r.onblocked = () => ok();
  });
}
