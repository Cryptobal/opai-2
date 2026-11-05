import { type Contexto, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

/** La persona vinculada al usuario que ejecuta (el propio o el responsable de la key). */
export async function personaPropia(ctx: Contexto) {
  const usuarioId =
    ctx.actor.tipo === "user" ? ctx.actor.id : ctx.actor.tipo === "agent" ? ctx.actor.viaUserId : null;
  if (!usuarioId) throw reglaDeNegocio("Esta acción requiere un usuario responsable.");
  const p = await ctx.db.persona.findFirst({ where: { usuarioId, archivadaEn: null, anonimizadaEn: null } });
  if (!p) throw noEncontrado("Tu ficha de persona");
  return p;
}
