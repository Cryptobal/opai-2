import type { Resultado } from "@opai/capabilities";

import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { idsCatalogo, type ModuloCatalogo } from "./etiquetas";
import type { RolVista } from "./roles";

export type { RolVista } from "./roles";

export type DatosPermisos = {
  catalogo: Resultado<ModuloCatalogo[]>;
  roles: Resultado<RolVista[]>;
  /** Rol base del usuario actual (jerarquía al asignar roles base). */
  miRol: string;
  /** Owner o admin con `core:users.manage`: crea, edita y archiva roles y fija excepciones (§16.2). */
  gestionaRoles: boolean;
  /** Permisos del catálogo que el usuario actual tiene de hecho y por eso puede conceder. */
  concedibles: string[];
};

/**
 * Datos comunes de Usuarios y Roles: catálogo, roles (sistema + personalizados) y lo que el usuario
 * actual puede conceder, medido por su acceso efectivo (rol personalizado + excepciones, ADR-022).
 * La UI solo oculta controles; la capacidad vuelve a validar todo (nadie concede lo que no tiene).
 */
export async function cargarPermisos(): Promise<DatosPermisos> {
  const [catalogo, roles, identidad] = await Promise.all([
    ejecutarComoUsuario<ModuloCatalogo[]>("erp", "core.permisos.catalogo"),
    ejecutarComoUsuario<RolVista[]>("erp", "core.roles.list", { incluirSistema: true }),
    identidadActual(),
  ]);
  const miRol = identidad?.actual?.rol ?? "viewer";
  const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
  const concedibles = catalogo.ok ? idsCatalogo(catalogo.data).filter((p) => puede(p)) : [];
  const gestionaRoles =
    (miRol === "owner" || miRol === "admin") && puede("core:users.manage");
  return { catalogo, roles, miRol, gestionaRoles, concedibles };
}
