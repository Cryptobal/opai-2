import { type Acceso, esRol, tienePermisoEfectivo } from "@opai/domain";

import type { Identidad } from "./actor";
import type { AccesoFila } from "./fuentes";

/**
 * Permisos efectivos en la UI (ADR-022). La navegación y los `puede*` de las pantallas tienen que
 * usar el acceso REAL del usuario —rol base o personalizado + excepciones—, no `tienePermiso(rolBase)`:
 * con un rol personalizado o una excepción, el rol base esconde secciones concedidas o muestra
 * secciones denegadas (hallazgo 1.1 del QA). Replica la misma regla que el borde arma en
 * `crearContexto`: si hay `permisosRol`, el rol base cede a esa lista; si no, manda el rol base.
 */
export function construirPuede(rol: string | null, acceso: AccesoFila): (permiso: string) => boolean {
  const rolBase = rol && esRol(rol) ? rol : null;
  const efectivo: Acceso = {
    rol: acceso.permisosRol != null ? null : rolBase,
    permisosRol: acceso.permisosRol,
    excepciones: acceso.excepciones,
  };
  return (permiso) => tienePermisoEfectivo(efectivo, permiso);
}

/** `construirPuede` a partir de la identidad del request (tenant actual). */
export function puedeDeIdentidad(identidad: Identidad): (permiso: string) => boolean {
  return construirPuede(identidad.actual?.rol ?? null, identidad.acceso);
}
