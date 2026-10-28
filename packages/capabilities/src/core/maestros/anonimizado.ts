import type { TenantTx } from "@opai/db";

import { reglaDeNegocio } from "../../errores";

/**
 * Una persona o un contacto anonimizado (Ley 21.719, Brief 07d) no admite escrituras: volver a
 * llenar su identidad crearía datos nuevos que la política de retención ya no vigilaría, y colgarle
 * un hecho regulado nuevo (p. ej. un vínculo) lo mezclaría con una identidad borrada.
 */
export function exigirNoAnonimizado(
  r: { anonimizadaEn?: Date | null; anonimizadoEn?: Date | null },
  que: string,
): void {
  if (r.anonimizadaEn || r.anonimizadoEn) throw anonimizado(que);
}

const anonimizado = (que: string) =>
  reglaDeNegocio(`${que} fue anonimizado y no admite cambios (Ley 21.719).`);

/**
 * Bloquea la fila del titular (`FOR UPDATE`) dentro de la transacción que escribe y exige que siga
 * sin anonimizar (§21, carrera de `exigirNoAnonimizado`). La anonimización toma el mismo bloqueo
 * antes de su UPDATE condicional, así que las dos escrituras se serializan sobre la fila: o la
 * escritura ve la marca y falla, o la anonimización ve lo escrito (p. ej. un vínculo nuevo).
 */
export async function bloquearNoAnonimizado(
  tx: TenantTx,
  tipo: "persona" | "contacto",
  id: string,
): Promise<void> {
  const filas =
    tipo === "persona"
      ? await tx.$queryRaw<{ anonimizado: boolean }[]>`
          /* 07d:bloqueo-titular */ SELECT anonimizada_en IS NOT NULL AS anonimizado FROM core.personas
          WHERE id = ${id}::uuid FOR UPDATE`
      : await tx.$queryRaw<{ anonimizado: boolean }[]>`
          /* 07d:bloqueo-titular */ SELECT anonimizado_en IS NOT NULL AS anonimizado FROM core.contactos
          WHERE id = ${id}::uuid FOR UPDATE`;
  if (filas[0]?.anonimizado) throw anonimizado(tipo === "persona" ? "La persona" : "El contacto");
}
