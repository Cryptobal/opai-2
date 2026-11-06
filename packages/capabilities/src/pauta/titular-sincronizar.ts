import type { TenantTx } from "@opai/db";

import { bloquearNoAnonimizado } from "../core/maestros/anonimizado";
import { conflicto } from "../errores";
import type { Contexto } from "../types";

/** Mueve el puesto del vínculo (nuevo titular, o los que apuntaban al puesto). Un cambio solo de puesto no genera anexo (decisión de Carlos, 6-nov-2026). */
async function moverVinculos(
  tx: TenantTx,
  p: { puestoId: string; instalacionId: string; titularId: string | null },
) {
  const cambiar = (id: string, puestoId: string | null) =>
    tx.vinculoLaboral.update({ where: { id }, data: { puestoId } });
  const salientes = await tx.vinculoLaboral.findMany({
    where: { puestoId: p.puestoId, estado: "vigente", ...(p.titularId ? { personaId: { not: p.titularId } } : {}) },
    select: { id: true },
  });
  for (const s of salientes) await cambiar(s.id, null);
  if (!p.titularId) return;
  await bloquearNoAnonimizado(tx, "persona", p.titularId);
  const propios = await tx.vinculoLaboral.findMany({
    where: { personaId: p.titularId, estado: "vigente", instalacionId: p.instalacionId },
    select: { id: true },
  });
  if (propios.length !== 1) throw conflicto("El vínculo de la persona cambió: vuelve a abrir el puesto.");
  await cambiar(propios[0]!.id, p.puestoId);
}


/**
 * Deja coherentes con la serie recién fijada el vínculo del titular (y el de quien salía) y la
 * cobertura del puesto, en la misma transacción. Lo usan `pauta.titular.asignar` y `pauta.series.fijar`.
 */
export async function sincronizarTitular(
  tx: TenantTx,
  _ctx: Contexto,
  r: { puestoId: string; instalacionId: string; titularId: string | null },
) {
  await moverVinculos(tx, r);
  await tx.puesto.update({
    where: { id: r.puestoId },
    data: { cobertura: r.titularId ? "cubierto" : "ppc", coberturaMotivo: r.titularId ? null : "sin_asignar" },
  });
}
