import { type Contexto, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

/** Usuario detrás de la ejecución: el propio usuario o el responsable de la API key (ADR-033). */
export function usuarioDe(ctx: Contexto): string {
  if (ctx.actor.tipo === "user") return ctx.actor.id;
  if (ctx.actor.tipo === "agent") return ctx.actor.viaUserId;
  throw reglaDeNegocio("Esta acción requiere un usuario responsable.");
}

/**
 * La persona vinculada al usuario por `core.personas.usuario_id` en esta empresa (alcance del portal,
 * ADR-022). Es la ÚNICA persona que estas capacidades pueden leer o editar: ningún input trae un id
 * de persona. Una ficha archivada o anonimizada responde como inexistente.
 */
export async function personaPropia(ctx: Contexto) {
  const p = await ctx.db.persona.findFirst({
    where: { usuarioId: usuarioDe(ctx), archivadaEn: null, anonimizadaEn: null },
  });
  if (!p) throw noEncontrado("Tu ficha de persona");
  return p;
}
