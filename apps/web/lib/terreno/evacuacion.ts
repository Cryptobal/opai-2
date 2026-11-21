import { NOMBRE_BD, VERSION_BD } from "./cola";
import {
  borrarDek,
  cifrarSnapshot,
  CLAVE_CIFRADO,
  descifrarSnapshot,
  diaOperativoChile,
  textoEvacuacion,
} from "./evacuacion-cifrado";
import type { FilaEvacuacion, SnapshotEvacuacion } from "./evacuacion-tipos";

export type { FilaEvacuacion, SnapshotEvacuacion };
export { diaOperativoChile, textoEvacuacion };

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(NOMBRE_BD, VERSION_BD);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}

const pedido = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((ok, mal) => {
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });

const confirmada = (t: IDBTransaction): Promise<void> =>
  new Promise((ok, mal) => {
    t.oncomplete = () => ok();
    t.onerror = () => mal(t.error);
    t.onabort = () => mal(t.error ?? new Error("transacción abortada"));
  });

/** Reemplaza la copia cifrada de evacuación (R26) tras cada sincronización exitosa de «en sitio». */
export async function guardarEvacuacion(items: FilaEvacuacion[]): Promise<void> {
  const dia = diaOperativoChile();
  const snap: SnapshotEvacuacion = { dia, sincronizadoEn: Date.now(), items };
  const db = await abrir();
  try {
    const t = db.transaction("meta", "readwrite");
    const meta = t.objectStore("meta");
    const sobre = await cifrarSnapshot(meta, snap);
    meta.put(sobre, CLAVE_CIFRADO);
    await confirmada(t);
  } finally {
    db.close();
  }
}

/** Lee la copia local; si es de otro día calendario (Chile), la borra y devuelve null (R26). */
export async function leerEvacuacion(): Promise<SnapshotEvacuacion | null> {
  const hoy = diaOperativoChile();
  const db = await abrir();
  try {
    const sobre = await pedido(
      db.transaction("meta").objectStore("meta").get(CLAVE_CIFRADO),
    );
    if (!sobre) return null;
    const t = db.transaction("meta", "readonly");
    const snap = await descifrarSnapshot(t.objectStore("meta"), sobre);
    if (!snap || snap.dia !== hoy) {
      await borrarEvacuacion();
      return null;
    }
    return snap;
  } finally {
    db.close();
  }
}

/** Borra la copia y su clave de cifrado (revocación del equipo o fin de día). */
async function borrarEvacuacion(): Promise<void> {
  const db = await abrir();
  try {
    const t = db.transaction("meta", "readwrite");
    const meta = t.objectStore("meta");
    meta.delete(CLAVE_CIFRADO);
    await borrarDek(meta);
    await confirmada(t);
  } finally {
    db.close();
  }
}