import { HASH_GENESIS } from "@opai/domain";

import type { TenantTx } from "./transaccion";

export type CadenaHechos = "marcas" | "correcciones";

/**
 * Bloquea la cabeza de una cadena de hechos regulados de la empresa (asistencia.cadenas_cabeza, con
 * FOR UPDATE) y devuelve el próximo número y el hash del eslabón anterior. Dos hechos simultáneos de la
 * misma empresa se serializan y la cadena no se bifurca (mismo patrón que `agregarABitacora`, ADR-023).
 * Quien llama inserta el hecho en la misma transacción y cierra con `avanzarCadena`.
 */
export async function bloquearCadena(
  tx: TenantTx,
  tenantId: string,
  cadena: CadenaHechos,
): Promise<{ siguienteSeq: number; hashAnterior: string }> {
  await tx.$executeRaw`
    INSERT INTO "asistencia"."cadenas_cabeza" (id, tenant_id, cadena, ultimo_seq, ultimo_hash, created_at, updated_at)
    VALUES (gen_random_uuid(), ${tenantId}::uuid, ${cadena}, 0, ${HASH_GENESIS}, now(), now())
    ON CONFLICT (tenant_id, cadena) DO NOTHING`;
  const filas = await tx.$queryRaw<{ ultimo_seq: number; ultimo_hash: string }[]>`
    SELECT ultimo_seq, ultimo_hash FROM "asistencia"."cadenas_cabeza"
    WHERE tenant_id = ${tenantId}::uuid AND cadena = ${cadena} FOR UPDATE`;
  const cabeza = filas[0];
  if (!cabeza) throw new Error("No se pudo bloquear la cabeza de la cadena.");
  return { siguienteSeq: cabeza.ultimo_seq + 1, hashAnterior: cabeza.ultimo_hash };
}

/** Deja la cabeza apuntando al eslabón recién insertado. */
export async function avanzarCadena(
  tx: TenantTx,
  tenantId: string,
  cadena: CadenaHechos,
  seq: number,
  hash: string,
): Promise<void> {
  await tx.cadenaCabeza.update({
    where: { tenantId_cadena: { tenantId, cadena } },
    data: { ultimoSeq: seq, ultimoHash: hash },
  });
}
