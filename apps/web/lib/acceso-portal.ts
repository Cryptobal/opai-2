import { esMembresiaDeCliente, esRolPlataforma, type Rol } from "@opai/domain";

import type { Identidad } from "./actor";

/** Plataforma es global: nunca se concede por la membresía ni por el rol del tenant (ADR-016). */
export function tieneAccesoAPortal(identidad: Identidad, portal: string): boolean {
  if (portal === "platform") return esRolPlataforma(identidad.usuario.platformRole);
  if (portal === "trabajador" && !identidad.modulosActivos.includes("portal_trabajador")) return false;
  return identidad.actual?.portales.includes(portal) ?? false;
}

/**
 * Sesión de la empresa (no de un contacto de cliente): cualquier membresía que no sea la de un contacto
 * (viewer con «cliente» como único portal), o un usuario de Plataforma. Vale aunque la membresía incluya
 * «cliente» por error (portales incoherentes que el runtime acepta): quien es de la empresa no entra al
 * Portal Cliente con esa cuenta, entre con el portal que entre.
 */
export function esCuentaDeEmpresa(identidad: Identidad): boolean {
  const a = identidad.actual;
  if (a) return !esMembresiaDeCliente(a.rol as Rol, a.portales);
  return esRolPlataforma(identidad.usuario.platformRole);
}
