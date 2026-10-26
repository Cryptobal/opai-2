import { coincide, moduloDe, permisosNoConcedibles } from "@opai/domain";

import { prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { catalogoPermisos } from "../me";

/** Que los permisos existan en el catálogo y no sean `platform:*` (nunca por un rol del tenant). */
export function validarEnCatalogo(permisos: readonly string[]): void {
  const catalogo = catalogoPermisos();
  const plataforma = permisos.filter((p) => moduloDe(p) === "platform");
  if (plataforma.length) {
    throw reglaDeNegocio(`Un rol del tenant no concede permisos de plataforma: ${plataforma.join(", ")}.`);
  }
  const desconocidos = permisos.filter((p) => !catalogo.some((c) => coincide(p, c)));
  if (desconocidos.length) {
    throw reglaDeNegocio(`Permisos fuera del catálogo: ${desconocidos.join(", ")}.`);
  }
}

/** Nadie concede más de lo que tiene (§16.2): esto mantiene el bloqueo financiero salvo que el
 * actor —owner/admin— sí tenga finanzas/nómina. Lanza si algún permiso no es suyo. */
export function validarConcedibles(ctx: Contexto, permisos: readonly string[]): void {
  const noConcedibles = permisosNoConcedibles((p) => ctx.autorizar(p), permisos, catalogoPermisos());
  if (noConcedibles.length) {
    throw prohibido(`No puedes conceder permisos que tú no tienes: ${[...new Set(noConcedibles)].join(", ")}.`);
  }
}

/** Validación completa para un rol o una concesión: catálogo + escalada. */
export function validarPermisos(ctx: Contexto, permisos: readonly string[]): void {
  if (permisos.length === 0) return;
  validarEnCatalogo(permisos);
  validarConcedibles(ctx, permisos);
}
