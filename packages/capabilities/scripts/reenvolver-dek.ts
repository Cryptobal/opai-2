import type { dbAdmin } from "@opai/db";
import { cifrar, descifrar } from "@opai/integrations";

type Admin = ReturnType<typeof dbAdmin>;
type Kek = { actual: Buffer; anterior: Buffer; version: number };

const b = (x: Uint8Array) => Uint8Array.from(x);
/** Más que el tope de `rotarDek` (300 s): si está rotando ese tenant, se espera su commit. */
const ESPERA_MS = 360_000;

/**
 * Reenvuelve la DEK de una fila con la KEK nueva (ADR-027) en una transacción que RELEE la fila con
 * `SELECT … FOR UPDATE`, el mismo bloqueo que toma `rotarDek`. Así las dos rotaciones se serializan:
 * si `rotarDek` reemplazó la DEK, se reenvuelve la nueva y nunca se vuelve a guardar la vieja
 * (revisión 5689206639, CAR-39). Devuelve `false` si la fila ya no existe o ya tiene la KEK nueva.
 */
export async function reenvolverFila(db: Admin, id: string, k: Kek): Promise<boolean> {
  // Script con el rol propietario (`dbAdmin`): el SQL crudo va dentro de su propia transacción y la
  // fila se identifica por id, sin depender de `app.tenant_id`.
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM core.claves_tenant WHERE id = ${id}::uuid FOR UPDATE`;
    const f = await tx.claveTenant.findUnique({ where: { id } });
    if (!f || f.kekVersion >= k.version) return false;
    const dek = descifrar(k.anterior, { cifrado: f.dekCifrada, iv: f.iv, tag: f.tag });
    const c = cifrar(k.actual, dek);
    await tx.claveTenant.update({
      where: { id },
      data: { dekCifrada: b(c.cifrado), iv: b(c.iv), tag: b(c.tag), kekVersion: k.version },
    });
    return true;
  }, { timeout: ESPERA_MS });
}

/** Reenvuelve, tenant por tenant, todas las DEK que siguen con una KEK anterior. */
export async function reenvolverDeks(db: Admin, k: Kek): Promise<number> {
  let recifradas = 0;
  const filas = await db.claveTenant.findMany({
    where: { kekVersion: { lt: k.version } },
    select: { id: true },
  });
  for (const { id } of filas) if (await reenvolverFila(db, id, k)) recifradas += 1;
  // Una fila que no se pudo reenvolver quedaría ilegible al retirar la KEK anterior: se falla para
  // que no se quite OPAI_SECRETS_KEY_ANTERIOR (revisión 5689460927).
  const pendientes = await db.claveTenant.count({ where: { kekVersion: { lt: k.version } } });
  if (pendientes > 0)
    throw new Error(
      `Quedan ${pendientes} DEK sin reenvolver con la KEK versión ${k.version}; reintenta antes de retirar la anterior.`,
    );
  return recifradas;
}
