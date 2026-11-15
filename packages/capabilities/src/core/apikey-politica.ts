import { prohibido, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { ajuste } from "./config/valores";

const DIA_MS = 86_400_000;

/** Vencimiento de una llave nueva sin el scope "platform": obligatorio y dentro del máximo de la empresa. */
export async function vencimientoConPolitica(ctx: Contexto, pedido?: string): Promise<Date> {
  const dias = await ajuste<number>(ctx, "core", "apikeys_vida_maxima_dias");
  const tope = Date.now() + dias * DIA_MS;
  if (!pedido) return new Date(tope);
  const expiraEn = new Date(pedido);
  if (expiraEn.getTime() <= Date.now()) throw reglaDeNegocio("La fecha de expiración debe ser futura.");
  if (expiraEn.getTime() > tope + 60_000) {
    throw reglaDeNegocio(`Una API key vence en ${dias} días como máximo (ajuste de la empresa).`);
  }
  return expiraEn;
}

/** El scope "*" solo fuera de producción o si la crea un owner (lo aprueba con su propia cuenta). */
export function exigirScopeAmplio(ctx: Contexto, scopes: readonly string[]): void {
  if (!scopes.includes("*") || process.env.NODE_ENV !== "production") return;
  if (ctx.rol !== "owner") {
    throw prohibido('El scope "*" solo lo puede crear un owner. Elige los módulos de la key.');
  }
}

/**
 * Permisos de una llave de usuario: o una lista explícita, o heredar todo de forma explícita. La
 * herencia completa deja de ser el valor por defecto.
 */
export function exigirPermisosElegidos(input: {
  tipo: string;
  permisos?: readonly string[] | undefined;
  heredarPermisos?: boolean | undefined;
}): void {
  if (input.permisos !== undefined && input.heredarPermisos) {
    throw reglaDeNegocio("Elige permisos o marca que hereda los del responsable, no ambas cosas.");
  }
  if (input.tipo === "usuario" && input.permisos === undefined && input.heredarPermisos !== true) {
    throw reglaDeNegocio(
      "Elige los permisos de la key, o marca explícitamente que hereda todos los del responsable.",
    );
  }
}
