// Módulo Inventario (ADR-116, CAR-235): catálogo de tipos (CAR-235) y activos por unidad (CAR-236).
// Existencias de ropa y asignaciones llegan con CAR-237 y CAR-238.
import type { Capacidad } from "../types";
import { activosActualizar, activosCrear } from "./activos-escritura";
import { activosCambiarEstado } from "./activos-estado";
import { activosGet, activosList } from "./activos-lectura";
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
  activosList,
  activosGet,
  activosCrear,
  activosActualizar,
  activosCambiarEstado,
];
