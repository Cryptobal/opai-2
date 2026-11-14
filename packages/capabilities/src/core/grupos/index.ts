import type { Capacidad } from "../../types";
import { gruposGet, gruposList } from "./consultas";
import { gruposArchive, gruposCreate, gruposUpdate } from "./escritura";
import { gruposMiembrosAdd, gruposMiembrosRemove } from "./miembros";
import { gruposRolesAsignar, gruposRolesList, gruposRolesQuitar } from "./roles";

/** Grupos o equipos de usuarios para autorización (CAR-251): UI, `/api/v1` y MCP. */
export const capacidadesGrupos: readonly Capacidad[] = [
  gruposList,
  gruposGet,
  gruposCreate,
  gruposUpdate,
  gruposArchive,
  gruposMiembrosAdd,
  gruposMiembrosRemove,
  gruposRolesList,
  gruposRolesAsignar,
  gruposRolesQuitar,
];
