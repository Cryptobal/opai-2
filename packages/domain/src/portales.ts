// Coherencia rol-portal de una membresía (ADR-016/033, NÚCLEO-D1). Lógica pura.

import { type Rol } from "./permisos";

/** Portales del tenant a los que una membresía puede dar acceso. */
export const PORTALES_TENANT = ["erp", "supervisor", "trabajador", "terreno", "cliente"] as const;
export type PortalTenant = (typeof PORTALES_TENANT)[number];

/**
 * Portal del contacto de una cuenta cliente (principal "cuenta", ADR-033): nunca el de una
 * membresía, que siempre es interna (persona de la empresa, invitada por su administrador). Es la
 * regla del encargo para usuarios internos. El rol base gobierna las acciones, no concede portales:
 * todos admiten los cuatro portales internos, sujetos a permisos y alcance. Plataforma nunca es
 * un portal de membresía (ADR-016), ni siquiera para owner. No amplía accesos existentes.
 */
const PORTALES_INTERNOS: readonly string[] = ["erp", "supervisor", "trabajador", "terreno"];

/** Matriz explícita del principal (ADR-033); los personalizados usan su rol base. */
export function portalesAdmitidos(
  rolBase: Rol,
  principal: "usuario" | "cuenta" | "persona" = "usuario",
): readonly string[] {
  if (principal === "cuenta") return ["cliente"];
  if (principal === "persona") return ["trabajador"];
  const porRol: Record<Rol, readonly string[]> = {
    owner: PORTALES_INTERNOS,
    admin: PORTALES_INTERNOS,
    gerente: PORTALES_INTERNOS,
    supervisor: PORTALES_INTERNOS,
    viewer: PORTALES_INTERNOS,
  };
  return porRol[rolBase] ?? [];
}

/**
 * Portales no admitidos por la membresía, incluidos nombres desconocidos. Vacío = coherente.
 * Un rol personalizado hereda la coherencia de su rol base (ADR-022): por eso recibe `rol`, el rol
 * base de la membresía, nunca el id del rol a medida.
 */
export function portalesIncoherentes(rolBase: Rol, portales: readonly string[]): string[] {
  return portales.filter((p) => !portalesAdmitidos(rolBase).includes(p));
}

export function esPortalCoherente(rolBase: Rol, portales: readonly string[]): boolean {
  return portalesIncoherentes(rolBase, portales).length === 0;
}
