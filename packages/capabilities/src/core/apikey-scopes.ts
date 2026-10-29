import { prohibido, reglaDeNegocio } from "../errores";
import { listarModulos } from "../module";
import type { Contexto } from "../types";

/** Scope de las keys de plataforma (ADR-055): explícito, nunca cubierto por "*". */
export const SCOPE_PLATAFORMA = "platform";

/** Vida máxima de una key con el scope "platform" (CAR-40): vence pronto y se renueva. */
export const VIDA_KEY_PLATAFORMA_MS = 7 * 86_400_000;

/**
 * Vencimiento de una key nueva. Con el scope "platform" es obligatorio y corto: por defecto 7 días
 * y nunca más (CAR-40); una key filtrada deja de servir sola. Sin ese scope, el pedido (o ninguno).
 */
export function expiracionDeKey(scopes: readonly string[], pedido?: string): Date | null {
  const expiraEn = pedido ? new Date(pedido) : null;
  if (expiraEn && expiraEn.getTime() <= Date.now()) {
    throw reglaDeNegocio("La fecha de expiración debe ser futura.");
  }
  if (!scopes.includes(SCOPE_PLATAFORMA)) return expiraEn;
  const tope = Date.now() + VIDA_KEY_PLATAFORMA_MS;
  if (expiraEn && expiraEn.getTime() > tope) {
    throw reglaDeNegocio('Una key con el scope "platform" vence en 7 días como máximo.');
  }
  return expiraEn ?? new Date(tope);
}

/**
 * Si una key con el scope "platform" sigue siéndolo al autenticar (CAR-40): solo con vencimiento y
 * a no más de 7 días (las creadas antes de esta regla, sin vencimiento o más largo, pierden el
 * acceso de plataforma hasta renovarlas; el resto de sus scopes sigue igual).
 */
export function plataformaVigente(expiraEn: Date | null, ahora = Date.now()): boolean {
  return expiraEn !== null && expiraEn.getTime() - ahora <= VIDA_KEY_PLATAFORMA_MS + 60_000;
}

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
