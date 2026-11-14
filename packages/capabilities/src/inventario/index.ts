// Módulo Inventario (ADR-116, CAR-235): catálogo de tipos de activos y ropa. Lo que sigue (activos,
// existencias y asignaciones) llega con CAR-236 a CAR-238.
import type { Capacidad } from "../types";
import { tiposActualizar } from "./tipos-actualizar";
import { tiposCrear } from "./tipos-escritura";
import { tiposGet, tiposList } from "./tipos-lectura";
import { tiposCargarSugeridos } from "./tipos-sugeridos";

export { PERMISOS_INVENTARIO } from "./comun";

export const capacidadesInventario: readonly Capacidad[] = [
  tiposList,
  tiposGet,
  tiposCrear,
  tiposActualizar,
  tiposCargarSugeridos,
];
