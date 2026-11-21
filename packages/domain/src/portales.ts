// Coherencia rol-portal de una membresía (ADR-016/033, NÚCLEO-D1). Lógica pura.

import { esRol, esRolPlataforma, type Rol } from "./permisos";

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
  // Contacto de un cliente (Portal Cliente, CAR-88): única excepción a «cliente nunca es de una
  // membresía». Solo el rol viewer (que además se reduce a un rol sistema sin permisos del ERP) y
  // SOLO con ese portal: mezclarlo con un portal interno sigue siendo incoherente.
  if (esMembresiaDeCliente(rolBase, portales)) return [];
  return portales.filter((p) => !portalesAdmitidos(rolBase).includes(p));
}

/** Membresía de un contacto de cliente: rol viewer con el portal «cliente» como único portal. */
export function esMembresiaDeCliente(rolBase: Rol, portales: readonly string[]): boolean {
  return rolBase === "viewer" && portales.length === 1 && portales[0] === "cliente";
}

const PORTALES_TRABAJADOR_MEMBRESIA = ["trabajador", "terreno"] as const;

/** Trabajador del portal: viewer cuyos portales son solo «trabajador» y, si aplica, «terreno» (CAR-803). */
export function esMembresiaPortalTrabajador(rolBase: Rol, portales: readonly string[]): boolean {
  if (rolBase !== "viewer" || portales.length === 0 || !portales.includes("trabajador")) return false;
  return portales.every((p) => (PORTALES_TRABAJADOR_MEMBRESIA as readonly string[]).includes(p));
}

export function esPortalCoherente(rolBase: Rol, portales: readonly string[]): boolean {
  return portalesIncoherentes(rolBase, portales).length === 0;
}

/** Entrada compartida para saber qué portales puede usar la cuenta (CAR-746). */
export type ContextoPortalesVisibles = {
  portalesMembresia: readonly string[];
  rol: string;
  platformRole: string | null | undefined;
  modulosActivos: readonly string[];
  /** null = ve toda la empresa; array = acotado por instalación (supervisor o cliente). */
  instalaciones: readonly string[] | null;
  personaVinculada: boolean;
};

/** Un portal aparece en el selector solo si la cuenta puede usarlo de verdad (CAR-746). */
export function puedeUsarPortal(portal: string, c: ContextoPortalesVisibles): boolean {
  if (portal === "platform") return esRolPlataforma(c.platformRole);
  if (portal === "terreno") return false;
  const rol = esRol(c.rol) ? c.rol : null;
  const soloCliente = rol !== null && esMembresiaDeCliente(rol, c.portalesMembresia);
  if (portal === "cliente") return soloCliente;
  if (soloCliente) return false;
  if (!c.portalesMembresia.includes(portal)) return false;
  if (portal === "trabajador") {
    return c.modulosActivos.includes("portal_trabajador") && c.personaVinculada;
  }
  if (portal === "supervisor") {
    return c.rol === "supervisor" || c.instalaciones !== null;
  }
  return true;
}

export function idsPortalesUsables(c: ContextoPortalesVisibles): string[] {
  const ids: string[] = PORTALES_TENANT.filter((id) => puedeUsarPortal(id, c));
  if (puedeUsarPortal("platform", c)) ids.push("platform");
  return ids;
}
