import type { Contexto } from "@opai/capabilities";

import type { InputListaCotizaciones } from "./lista-filtros";

/** Acota la lista a cotizaciones de negocios de una cuenta o responsable (sin relación Prisma en cpq). */
export async function acotarNegocioLista(
  ctx: Contexto,
  input: InputListaCotizaciones,
  filtro: Record<string, unknown>,
): Promise<{ items: []; siguiente: null } | void> {
  if (!input.cuentaId && !input.responsableId) return;
  const negocios = await ctx.db.negocio.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(input.cuentaId ? { cuentaId: input.cuentaId } : {}),
      ...(input.responsableId ? { responsableId: input.responsableId } : {}),
    },
    select: { id: true },
  });
  const ids = negocios.map((n) => n.id);
  if (input.negocioId) {
    if (!ids.includes(input.negocioId)) return { items: [], siguiente: null };
    filtro.negocioId = input.negocioId;
    return;
  }
  if (ids.length === 0) return { items: [], siguiente: null };
  filtro.negocioId = { in: ids };
}