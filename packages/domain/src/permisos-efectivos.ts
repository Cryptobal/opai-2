// Permisos efectivos (ADR-022, Brief 07c B2): combina el rol (base o personalizado) con las
// excepciones por usuario. Lógica pura; no reemplaza `tienePermiso`/`permisosDe`, los envuelve.

import { coincide, moduloDe, type Rol, tienePermiso } from "./permisos";

/** Excepción de permiso por usuario: concede o deniega un permiso puntual sobre su rol. */
export type Excepcion = { permiso: string; conceder: boolean };

/**
 * Acceso efectivo de un actor en un tenant: su rol base (patrones de ADR-016) o un rol personalizado
 * del tenant (lista de permisos del catálogo), más las excepciones por usuario. Denegar siempre gana.
 */
export type Acceso = {
  /** Rol base del sistema, o null si el usuario tiene un rol personalizado del tenant. */
  rol: Rol | null;
  /** Permisos del rol personalizado (subconjunto del catálogo) cuando `rol` es null. */
  permisosRol?: readonly string[] | null;
  /** Excepciones por usuario sobre el rol. */
  excepciones?: readonly Excepcion[] | null;
};

/** Si el rol (base o personalizado), sin excepciones, concede el permiso. */
function rolConcede(acceso: Acceso, permiso: string): boolean {
  if (acceso.rol !== null) return tienePermiso(acceso.rol, permiso);
  return (acceso.permisosRol ?? []).some((p) => coincide(p, permiso));
}

/**
 * Permiso efectivo: una excepción que deniega gana sobre todo; una que concede gana sobre el rol;
 * sin excepción, decide el rol. Los `platform:*` nunca salen de aquí (solo de `platformRole`).
 */
export function tienePermisoEfectivo(acceso: Acceso, permiso: string): boolean {
  if (moduloDe(permiso) === "platform") return false;
  const relevantes = (acceso.excepciones ?? []).filter((e) => coincide(e.permiso, permiso));
  if (relevantes.some((e) => !e.conceder)) return false;
  if (relevantes.some((e) => e.conceder)) return true;
  return rolConcede(acceso, permiso);
}

/** Permisos efectivos de un acceso dentro de un catálogo, solo de módulos activos (core siempre). */
export function permisosEfectivos(
  acceso: Acceso,
  catalogo: readonly string[],
  modulosActivos: readonly string[],
): string[] {
  const activos = new Set(["core", ...modulosActivos]);
  return catalogo.filter((p) => activos.has(moduloDe(p)) && tienePermisoEfectivo(acceso, p));
}

/**
 * Permisos concretos del catálogo que los patrones concederían pero que el actor no puede otorgar
 * (no los tiene él mismo): nadie concede más de lo que tiene (análogo a `puedeAsignarRol`). Se usa
 * para validar roles personalizados y excepciones antes de guardarlos. `platform:*` nunca es
 * concedible por esta vía (lo filtra `tienePermisoEfectivo`).
 */
export function permisosNoConcedibles(
  concede: (permiso: string) => boolean,
  patrones: readonly string[],
  catalogo: readonly string[],
): string[] {
  return catalogo.filter((p) => patrones.some((pat) => coincide(pat, p)) && !concede(p));
}
