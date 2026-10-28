import { prohibido, reglaDeNegocio } from "../errores";
import { listarModulos } from "../module";
import type { Contexto } from "../types";

/** Scope de las keys de plataforma (ADR-055): explícito, nunca cubierto por "*". */
export const SCOPE_PLATAFORMA = "platform";

/**
 * Valida los scopes de una key nueva: módulos conocidos, "*" o "core", y "platform" solo si quien
 * la crea (su responsable) tiene hoy `platformRole`, es de tipo "usuario" y hereda sus permisos. En
 * cada llamada, `autorizador` vuelve a cruzar el `platformRole` VIGENTE del responsable.
 */
export function validarScopes(
  ctx: Contexto,
  input: { scopes: readonly string[]; tipo: string; permisos?: readonly string[] | undefined },
): void {
  const validos = new Set(["*", "core", SCOPE_PLATAFORMA, ...listarModulos().map((m) => m.id)]);
  const invalidos = input.scopes.filter((s) => !validos.has(s));
  if (invalidos.length) throw reglaDeNegocio(`Scopes desconocidos: ${invalidos.join(", ")}.`);
  if (!input.scopes.includes(SCOPE_PLATAFORMA)) return;
  if (!ctx.usuario?.platformRole) {
    throw prohibido('Solo un usuario de plataforma puede crear una key con el scope "platform".');
  }
  if (input.tipo !== "usuario" || input.permisos !== undefined) {
    throw reglaDeNegocio(
      'Una key con el scope "platform" es de tipo usuario y hereda los permisos de su responsable.',
    );
  }
}
