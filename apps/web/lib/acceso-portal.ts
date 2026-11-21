import { esMembresiaDeCliente, esRolPlataforma, puedeUsarPortal, type Rol } from "@opai/domain";

import type { Identidad } from "./actor";
import { contextoPortalesDe } from "./contexto-portales";

/** Plataforma es global: el resto exige portal usable real, no solo el array de la membresía (CAR-746). */
export function tieneAccesoAPortal(identidad: Identidad, portal: string): boolean {
  const c = contextoPortalesDe(identidad);
  // Terreno no va en el selector, pero con sesión sirve la guía de emparejado (CAR-527).
  if (portal === "terreno") {
    const rol = c.rol as Rol;
    if (esMembresiaDeCliente(rol, c.portalesMembresia)) return false;
    return c.portalesMembresia.includes("terreno");
  }
  return puedeUsarPortal(portal, c);
}

/**
 * Sesión de la empresa (no de un contacto de cliente): cualquier membresía que no sea la de un contacto
 * (viewer con «cliente» como único portal), o un usuario de Plataforma.
 */
export function esCuentaDeEmpresa(identidad: Identidad): boolean {
  const a = identidad.actual;
  if (a) return !esMembresiaDeCliente(a.rol as Rol, a.portales);
  return esRolPlataforma(identidad.usuario.platformRole);
}