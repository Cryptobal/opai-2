import type { TenantTx } from "@opai/db";

import { vistaVinculo } from "../core/maestros/vinculos-vista";
import { bloquearNoAnonimizado } from "../core/maestros/anonimizado";
import { conflicto } from "../errores";
import type { Contexto } from "../types";

/** Mueve el puesto del vínculo (nuevo titular, o los que apuntaban al puesto) y avisa por evento. */
async function moverVinculos(
  tx: TenantTx,
  ctx: Contexto,
  p: { puestoId: string; instalacionId: string; titularId: string | null },
) {
  const cambiar = async (id: string, puestoId: string | null) => {
    const antes = await tx.vinculoLaboral.findUniqueOrThrow({ where: { id } });
    if (antes.puestoId === puestoId) return;
    const despues = await tx.vinculoLaboral.update({ where: { id }, data: { puestoId } });
    // Mismo evento que `core.vinculos.update`: el cambio de puesto puede mover la capa de sueldo (R11).
    await ctx.eventos.emitir(tx, {
      tipo: "core.vinculo.actualizado",
      entidadTipo: "vinculo",
      entidadId: id,
      payload: { personaId: antes.personaId, antes: vistaVinculo(antes), despues: vistaVinculo(despues), campos: ["puestoId"] },
    });
  };
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
  ctx: Contexto,
  r: { puestoId: string; instalacionId: string; titularId: string | null },
) {
  await moverVinculos(tx, ctx, r);
  await tx.puesto.update({
    where: { id: r.puestoId },
    data: { cobertura: r.titularId ? "cubierto" : "ppc", coberturaMotivo: r.titularId ? null : "sin_asignar" },
  });
}
