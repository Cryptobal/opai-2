// Roles y permisos (ADR-016). Permisos con formato `<modulo>:<accion>`; los roles se expresan con
// patrones con comodín (`*`) y una lista de denegaciones que siempre gana. Lógica pura.

export { ROLES, ROLES_PLATAFORMA, type Rol, type RolPlataforma } from "./permisos-roles";
export { PERMISOS_CORE, PERMISOS_PLATAFORMA } from "./permisos-catalogo";
export { PATRONES_POR_ROL } from "./permisos-patrones";

import { PATRONES_POR_ROL } from "./permisos-patrones";
import { ROLES, ROLES_PLATAFORMA, type Rol, type RolPlataforma } from "./permisos-roles";

const PATRONES_PLATAFORMA: Readonly<Record<RolPlataforma, readonly string[]>> = {
  owner: ["platform:*"],
  support: ["platform:*.read"],
};

const cache = new Map<string, RegExp>();

/** `*` coincide con cualquier secuencia de caracteres; el resto es literal. */
export function coincide(patron: string, permiso: string): boolean {
  let re = cache.get(patron);
  if (!re) {
    const cuerpo = patron
      .split("*")
      .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    re = new RegExp(`^${cuerpo}$`);
    cache.set(patron, re);
  }
  return re.test(permiso);
}

export function esRol(valor: string): valor is Rol {
  return (ROLES as readonly string[]).includes(valor);
}

export function esRolPlataforma(valor: string | null | undefined): valor is RolPlataforma {
  return valor != null && (ROLES_PLATAFORMA as readonly string[]).includes(valor);
}

export function moduloDe(permiso: string): string {
  return permiso.split(":")[0] ?? "";
}

/**
 * Si un rol del tenant tiene el permiso. Los permisos `platform:*` nunca se obtienen por un rol
 * del tenant (ni siquiera owner): solo por `platformRole`.
 */
export function tienePermiso(rol: Rol, permiso: string): boolean {
  if (moduloDe(permiso) === "platform") return false;
  const { permitir, denegar } = PATRONES_POR_ROL[rol];
  if (denegar.some((p) => coincide(p, permiso))) return false;
  return permitir.some((p) => coincide(p, permiso));
}

/** Si el rol de plataforma tiene el permiso. Solo cubre permisos `platform:*`. */
export function tienePermisoPlataforma(
  rol: RolPlataforma | null | undefined,
  permiso: string,
): boolean {
  if (!rol || moduloDe(permiso) !== "platform") return false;
  return PATRONES_PLATAFORMA[rol].some((p) => coincide(p, permiso));
}

/**
 * Permisos efectivos de un rol dentro de un catálogo, solo de módulos activos
 * (`core` siempre está activo). Para `core.me` y la navegación.
 */
export function permisosDe(
  rol: Rol,
  catalogo: readonly string[],
  modulosActivos: readonly string[],
): string[] {
  const activos = new Set(["core", ...modulosActivos]);
  return catalogo.filter((p) => activos.has(moduloDe(p)) && tienePermiso(rol, p));
}

/** Un usuario nunca puede asignar un rol más alto que el suyo. Owner solo lo asigna un owner. */
export function puedeAsignarRol(asignador: Rol, rol: Rol): boolean {
  return (
    ROLES.indexOf(asignador) <= ROLES.indexOf(rol) && (rol !== "owner" || asignador === "owner")
  );
}
