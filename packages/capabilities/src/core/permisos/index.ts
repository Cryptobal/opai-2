import type { Capacidad } from "../../types";
import { rolesAssign } from "./asignaciones";
import { permisosCatalogo } from "./catalogo";
import { excepcionesList, excepcionesSet } from "./excepciones";
import { rolesArchive, rolesUpdate } from "./roles-edicion";
import { rolesCreate, rolesList } from "./roles";
import { supervisoresAsignar, supervisoresList, supervisoresQuitar } from "./supervisores";
import { supervisoresDeInstalacion } from "./supervisores-instalacion";

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
  supervisoresDeInstalacion,
  supervisoresAsignar,
  supervisoresQuitar,
];
