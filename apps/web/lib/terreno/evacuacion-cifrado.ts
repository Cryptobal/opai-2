import type { SnapshotEvacuacion } from "./evacuacion-tipos";

const ALG = "AES-GCM";
const META_DEK = "evacuacion-dek";

type Sobre = { iv: string; ct: string };

const b64 = (b: ArrayBuffer | Uint8Array) => {
  const u8 = b instanceof Uint8Array ? b : new Uint8Array(b);
  return btoa(String.fromCharCode(...u8));
};
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Día operativo de control de acceso en Chile (mismo criterio que el servidor: «hoy» en sitio). */
export function diaOperativoChile(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

export function textoEvacuacion(s: SnapshotEvacuacion): string {
  const hora = (iso: string) =>
    new Date(iso).toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      dateStyle: "short",
      timeStyle: "short",
    });
  const filas = s.items.map(
    (r) =>
      `${r.nombre}\t${r.empresa ?? "—"}\t${r.tipoRegistro}\t${r.documento}\t${hora(r.entradaEn)}`,
  );
  return [
    `Lista de evacuación · ${s.dia}`,
    `Copia sincronizada: ${hora(new Date(s.sincronizadoEn).toISOString())}`,
    `Personas en sitio: ${s.items.length}`,
    "",
    "Nombre\tEmpresa\tTipo\tDocumento\tEntrada",
    ...filas,
  ].join("\n");
}

async function dek(
  meta: IDBObjectStore,
): Promise<CryptoKey> {
  const raw = await new Promise<ArrayBuffer | undefined>((ok, mal) => {
    const q = meta.get(META_DEK);
    q.onsuccess = () => ok(q.result as ArrayBuffer | undefined);
    q.onerror = () => mal(q.error);
  });
  if (raw) {
    return crypto.subtle.importKey("raw", raw, { name: ALG, length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]);
  }
  const material = crypto.getRandomValues(new Uint8Array(32));
  const clave = await crypto.subtle.importKey("raw", material, { name: ALG, length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  await new Promise<void>((ok, mal) => {
    const q = meta.put(material.buffer, META_DEK);
    q.onsuccess = () => ok();
    q.onerror = () => mal(q.error);
  });
  return clave;
}

export async function cifrarSnapshot(
  meta: IDBObjectStore,
  datos: SnapshotEvacuacion,
): Promise<Sobre> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const clave = await dek(meta);
  const ct = await crypto.subtle.encrypt(
    { name: ALG, iv },
    clave,
    new TextEncoder().encode(JSON.stringify(datos)),
  );
  return { iv: b64(iv), ct: b64(ct) };
}

export async function descifrarSnapshot(
  meta: IDBObjectStore,
  sobre: Sobre,
): Promise<SnapshotEvacuacion | null> {
  try {
    const clave = await dek(meta);
    const plano = await crypto.subtle.decrypt(
      { name: ALG, iv: deB64(sobre.iv) },
      clave,
      deB64(sobre.ct),
    );
    return JSON.parse(new TextDecoder().decode(plano)) as SnapshotEvacuacion;
  } catch {
    return null;
  }
}

export async function borrarDek(meta: IDBObjectStore): Promise<void> {
  await new Promise<void>((ok, mal) => {
    const q = meta.delete(META_DEK);
    q.onsuccess = () => ok();
    q.onerror = () => mal(q.error);
  });
}

export const CLAVE_CIFRADO = "evacuacion-cifrado";