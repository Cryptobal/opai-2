import { prohibido, type Contexto } from "@opai/capabilities";

/** El usuario humano que decide (propone, registra o resuelve): sin sesión de usuario no hay autor. */
export function usuarioId(ctx: Contexto): string {
  if (!ctx.usuario) throw prohibido("Esta acción necesita una sesión de usuario: queda con su autor.");
  return ctx.usuario.id;
}
