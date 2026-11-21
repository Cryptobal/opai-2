import { idsPortalesUsables, type ContextoPortalesVisibles } from "@opai/domain";

import type { Contexto } from "../types";

function contextoPortalesDeCtx(
  ctx: Contexto,
  personaVinculada: boolean,
): ContextoPortalesVisibles {
  return {
    portalesMembresia: ctx.portalesMembresia,
    rol: ctx.rol ?? "viewer",
    platformRole: ctx.usuario?.platformRole ?? null,
    modulosActivos: ctx.modulosActivos,
    instalaciones: ctx.alcance?.instalaciones ?? null,
    personaVinculada,
  };
}

export function portalesUsablesDe(ctx: Contexto, personaVinculada: boolean): string[] {
  return idsPortalesUsables(contextoPortalesDeCtx(ctx, personaVinculada));
}

export async function personaVinculadaEn(ctx: Contexto): Promise<boolean> {
  if (!ctx.usuario) return false;
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