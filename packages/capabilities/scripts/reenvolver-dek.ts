import type { dbAdmin } from "@opai/db";
import { cifrar, descifrar } from "@opai/integrations";

type Admin = ReturnType<typeof dbAdmin>;
type Fila = {
  id: string;
  dekCifrada: Uint8Array;
  iv: Uint8Array;
  tag: Uint8Array;
  kekVersion: number;
};
type Kek = { actual: Buffer; anterior: Buffer; version: number };

/**
 * Reenvuelve la DEK de una fila con la KEK nueva (ADR-027) con una escritura CONDICIONAL: solo si la
 * fila sigue siendo la que se leyó (mismo `iv` y versión de KEK). Si entre medio corrió `rotarDek`
 * (que reemplaza la DEK bajo `FOR UPDATE`), el UPDATE espera su commit, ya no coincide y no escribe:
 * así nunca se vuelve a guardar la DEK vieja sobre la nueva (revisión 5689206639, CAR-39).
 */
export async function reenvolverFila(db: Admin, f: Fila, k: Kek): Promise<boolean> {
  const dek = descifrar(k.anterior, { cifrado: f.dekCifrada, iv: f.iv, tag: f.tag });
  const c = cifrar(k.actual, dek);
  const { count } = await db.claveTenant.updateMany({
    where: { id: f.id, kekVersion: f.kekVersion, iv: { equals: Uint8Array.from(f.iv) } },
    data: {
      dekCifrada: Uint8Array.from(c.cifrado),
      iv: Uint8Array.from(c.iv),
      tag: Uint8Array.from(c.tag),
      kekVersion: k.version,
    },
  });
  return count === 1;
}

/** Reenvuelve todas las DEK con KEK anterior; una fila que cambió entre medio se relee y reintenta. */
export async function reenvolverDeks(db: Admin, k: Kek): Promise<number> {
  let recifradas = 0;
  for (const leida of await db.claveTenant.findMany({ where: { kekVersion: { lt: k.version } } })) {
    let f: Fila | null = leida;
    for (let intento = 0; f && f.kekVersion < k.version && intento < 3; intento++) {
      if (await reenvolverFila(db, f, k)) {
        recifradas += 1;
        break;
      }
      f = await db.claveTenant.findUnique({ where: { id: leida.id } });
    }
  }
  // Una fila que no se pudo reenvolver quedaría ilegible al retirar la KEK anterior: se falla para
  // que no se quite OPAI_SECRETS_KEY_ANTERIOR (revisión 5689460927).
  const pendientes = await db.claveTenant.count({ where: { kekVersion: { lt: k.version } } });
  if (pendientes > 0)
    throw new Error(
      `Quedan ${pendientes} DEK sin reenvolver con la KEK versión ${k.version}; reintenta antes de retirar la anterior.`,
    );
  return recifradas;
}
