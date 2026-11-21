import { armarContextoPortalesVisibles, idsPortalesUsables } from "@opai/domain";

import type { Contexto } from "../types";

export function portalesUsablesDe(ctx: Contexto, personaVinculada: boolean): string[] {
  return idsPortalesUsables(
    armarContextoPortalesVisibles({
      portalesMembresia: ctx.portalesMembresia,
      rol: ctx.rol,
      platformRole: ctx.usuario?.platformRole ?? null,
      modulosActivos: ctx.modulosActivos,
      instalaciones: ctx.alcance?.instalaciones ?? null,
      personaVinculada,
    }),
  );
}

export async function personaVinculadaEn(ctx: Contexto): Promise<boolean> {
  if (!ctx.usuario || !ctx.conTenant) return false;
  const p = await ctx.db.persona.findFirst({
    where: {
      tenantId: ctx.tenantId,
      usuarioId: ctx.usuario.id,
      archivadaEn: null,
      anonimizadaEn: null,
    },
    select: { id: true },
  });
  return p !== null;
}