import type { Capacidad } from "../../types";
import { rolesAssign } from "./asignaciones";
import { permisosCatalogo } from "./catalogo";
import { excepcionesList, excepcionesSet } from "./excepciones";
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
