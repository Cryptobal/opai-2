import type { Capacidad } from "../../types";
import { excepcionesList, excepcionesSet, rolesAssign } from "./asignaciones";
import { permisosCatalogo } from "./catalogo";
import { rolesArchive, rolesUpdate } from "./roles-edicion";
import { rolesCreate, rolesList } from "./roles";

/** Capacidades de roles personalizados y excepciones por usuario (Brief 07c B2, ADR-022). */
export const capacidadesPermisos: readonly Capacidad[] = [
  permisosCatalogo,
  rolesList,
  rolesCreate,
  rolesUpdate,
  rolesArchive,
  rolesAssign,
  excepcionesList,
  excepcionesSet,
];
