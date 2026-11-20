import type { Contexto } from "@opai/capabilities";

/** Predicados de texto y negocios de este tenant, aplicados antes del cursor (CAR-585). */
async function ampliarBusquedaCotizaciones(ctx: Contexto, q: string) {
  const texto = { contains: q, mode: "insensitive" as const };
  const negocios = await ctx.db.negocio.findMany({
    where: {
      tenantId: ctx.tenantId,
      OR: [{ titulo: texto }, { cuenta: { nombre: texto } }],
    },
    select: { id: true },
  });
  const ids = negocios.map((n) => n.id);
  return [
    { codigo: texto },
    { titulo: texto },
    ...(ids.length ? [{ negocioId: { in: ids } }] : []),
  ];
}

/** Compone la búsqueda con los filtros de negocio, archivo y estado vigentes. */
export async function filtroListaCotizaciones(
  ctx: Contexto,
  input: {
    negocioId?: string | undefined;
    estado?: string | undefined;
    q?: string | undefined;
    incluirArchivadas: boolean;
    soloArchivadas: boolean;
  },
) {
  const filtro: Record<string, unknown> = {};
  if (input.negocioId) filtro["negocioId"] = input.negocioId;
  if (input.estado) filtro["versiones"] = { some: { estado: input.estado } };
  else if (!input.incluirArchivadas && !input.soloArchivadas)
    filtro["versiones"] = { none: { estado: "archivada" } };
  if (input.soloArchivadas) filtro["archivadaEn"] = { not: null };
  else if (!input.incluirArchivadas) filtro["archivadaEn"] = null;
  if (input.q) filtro["OR"] = await ampliarBusquedaCotizaciones(ctx, input.q);
  return filtro;
}
