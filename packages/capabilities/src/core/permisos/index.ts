import type { Capacidad } from "../../types";
import { excepcionesList, excepcionesSet, rolesAssign } from "./asignaciones";
import { permisosCatalogo } from "./catalogo";
import { rolesArchive, rolesUpdate } from "./roles-edicion";
import { rolesCreate, rolesList } from "./roles";
import { supervisoresAsignar, supervisoresList, supervisoresQuitar } from "./supervisores";

/** Capacidades de roles, excepciones y alcance del supervisor (Brief 07c B2 y B3, ADR-022). */
export const capacidadesPermisos: readonly Capacidad[] = [
  permisosCatalogo,
  rolesList,
  rolesCreate,
  rolesUpdate,
  rolesArchive,
  rolesAssign,
  excepcionesList,
  excepcionesSet,
  supervisoresList,
  supervisoresAsignar,
  supervisoresQuitar,
];
