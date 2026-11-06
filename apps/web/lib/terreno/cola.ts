/**
 * Cola local de hechos de Terreno (CAR-78 · B3, ADR-044 punto 3). Vive en IndexedDB ("opai-terreno") y la
 * envía el service worker (`public/sw.js`) a /api/terreno/lote. El esquema debe coincidir con el del SW.
 */
export const NOMBRE_BD = "opai-terreno";
export const ETIQUETA_SYNC = "opai-terreno-lote";

export type HechoLocal = {
  clave: string;
  tipo: string;
  payload: unknown;
  personaId: string | null;
  horaHecho: string;
  creadoEn: number;
};

export type EstadoEnvio = {
  pendientes: number;
  intentoEn: number;
  ok?: boolean;
  error?: string;
  desfaseSegundos?: number;
  rechazados?: number;
};

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(NOMBRE_BD, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("cola", { keyPath: "clave" });
      r.result.createObjectStore("meta");
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

/** Guarda un hecho en el teléfono y pide enviarlo. La hora del hecho es la del reloj del equipo. */
export async function encolarHecho(h: {
  tipo: string;
  payload: unknown;
  personaId?: string | null;
}): Promise<void> {
  const db = await abrir();
  try {
    const hecho: HechoLocal = {
      clave: crypto.randomUUID(),
      tipo: h.tipo,
      payload: h.payload,
      personaId: h.personaId ?? null,
      horaHecho: new Date().toISOString(),
      creadoEn: Date.now(),
    };
    await pedido(db.transaction("cola", "readwrite").objectStore("cola").put(hecho));
  } finally {
    db.close();
  }
  await pedirEnvio();
}

export async function leerCola(): Promise<HechoLocal[]> {
  const db = await abrir();
  try {
    const todos = await pedido<HechoLocal[]>(db.transaction("cola").objectStore("cola").getAll());
    return todos.sort((a, b) => a.creadoEn - b.creadoEn);
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
