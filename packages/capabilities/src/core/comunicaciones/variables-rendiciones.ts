import type { EventoPublicado } from "../../eventos/consumidores";
import type { Contexto } from "../../types";

export async function variablesRendiciones(
  ctx: Contexto,
  ev: EventoPublicado,
  base: string,
  empresa: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!ev.entidadId) return { empresa };
  const r = await ctx.db.rendicion.findFirst({
    where: { id: ev.entidadId },
    select: {
      id: true,
      codigo: true,
      descripcion: true,
      motivoDecision: true,
      aprobadorId: true,
    },
  });
  if (!r) return { empresa };
  const aprobador = r.aprobadorId
    ? await ctx.db.user.findUnique({ where: { id: r.aprobadorId }, select: { name: true } })
    : null;
  return {
    rendicion: { codigo: `REN-${r.codigo}`, descripcion: r.descripcion },
    motivo: r.motivoDecision ?? "",
    aprobador: { nombre: aprobador?.name ?? "" },
    empresa,
    url: `${base}/rendiciones/${r.id}`,
  };
}