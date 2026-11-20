import type { Contexto } from "../../types";

import { instalacionDeVisitaOTicket } from "./alcance-doc-ticket-visita";

/** Instalaciones a las que pertenece el dueño de un documento (persona/empresa → ninguna). */
async function instalacionesDelDueno(ctx: Contexto, documentoId: string): Promise<string[]> {
  const prop = await ctx.db.documentoVinculo.findFirst({
    where: { documentoId, rol: "propietario" },
    select: { entidadTipo: true, entidadId: true },
  });
  if (!prop) return [];
  if (prop.entidadTipo === "instalacion") return [prop.entidadId];
  if (prop.entidadTipo === "cuenta")
    return (
      await ctx.db.instalacion.findMany({
        where: { cuentaId: prop.entidadId },
        select: { id: true },
      })
    ).map((i) => i.id);
  if (prop.entidadTipo === "puesto") {
    const p = await ctx.db.puesto.findUnique({
      where: { id: prop.entidadId },
      select: { instalacionId: true },
    });
    return p ? [p.instalacionId] : [];
  }
  if (prop.entidadTipo === "persona") {
    const v = await ctx.db.vinculoLaboral.findFirst({
      where: { personaId: prop.entidadId, estado: "vigente" },
      select: { instalacionId: true },
    });
    return v?.instalacionId ? [v.instalacionId] : [];
  }
  const ext = await instalacionDeVisitaOTicket(ctx, prop.entidadTipo, prop.entidadId);
  if (ext.length) return ext;
  return [];
}

/**
 * Usuarios supervisores que tienen un documento en su alcance, con el mismo criterio que
 * `documentosEnAlcance` (el dueño está en una instalación a cargo). Lo usa Comunicaciones para
 * avisar de vencimientos solo a quien corresponde, no a todos los supervisores del tenant.
 */
export async function supervisoresConDocEnAlcance(
  ctx: Contexto,
  documentoId: string,
): Promise<Set<string>> {
  const instalacionIds = await instalacionesDelDueno(ctx, documentoId);
  if (!instalacionIds.length) return new Set();
  const asign = await ctx.db.supervisorInstalacion.findMany({
    where: { instalacionId: { in: instalacionIds } },
    select: { membershipId: true },
  });
  if (!asign.length) return new Set();
  const ms = await ctx.db.membership.findMany({
    where: {
      id: { in: [...new Set(asign.map((a) => a.membershipId))] },
      estado: "activa",
      rol: "supervisor",
    },
    select: { userId: true },
  });
  return new Set(ms.map((m) => m.userId));
}