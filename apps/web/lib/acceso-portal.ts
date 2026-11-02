import { esRolPlataforma } from "@opai/domain";

import type { Identidad } from "./actor";

/** Plataforma es global: nunca se concede por la membresía ni por el rol del tenant (ADR-016). */
export function tieneAccesoAPortal(identidad: Identidad, portal: string): boolean {
  if (portal === "platform") return esRolPlataforma(identidad.usuario.platformRole);
  if (portal === "trabajador" && !identidad.modulosActivos.includes("portal_trabajador")) return false;
  return identidad.actual?.portales.includes(portal) ?? false;
}
