import type { Contexto } from "@opai/capabilities";

/** Amplía `filtro.OR` con negocios cuya cuenta o título calza con `q` (lista CAR-585). */
export async function ampliarBusquedaCotizaciones(
  ctx: Contexto,
  q: string,
  filtro: Record<string, unknown>,
) {
  const texto = { contains: q, mode: "insensitive" as const };
  const negocios = await ctx.db.negocio.findMany({
    where: {
      tenantId: ctx.tenantId,
      OR: [{ titulo: texto }, { cuenta: { nombre: texto } }],
    },
    select: { id: true },
  });
  const ids = negocios.map((n) => n.id);
  const base = Array.isArray(filtro.OR) ? (filtro.OR as Record<string, unknown>[]) : [];
  filtro.OR = [...base, ...(ids.length ? [{ negocioId: { in: ids } }] : [])];
}