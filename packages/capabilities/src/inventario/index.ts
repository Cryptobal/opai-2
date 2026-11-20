// Módulo Inventario (ADR-116, CAR-235): catálogo de tipos (CAR-235) activos por unidad (CAR-236) y
// existencias de ropa por talla (CAR-237) y entregas a personas o instalaciones (CAR-238), con la ropa ligada al uniforme (CAR-504).
import type { Capacidad } from "../types";
import { activosActualizar, activosCrear } from "./activos-escritura";
import { activosCambiarEstado } from "./activos-estado";
import { activosGet, activosList } from "./activos-lectura";
import { entregasDevolver } from "./entregas-devolver";
import { entregarActivo, entregarRopa } from "./entregas-escritura";
import { entregasList } from "./entregas-lectura";
import { prendasList, tallaDePersona } from "./prendas";
import { ropaAjustar, ropaIngresar } from "./ropa-escritura";
import { ropaList, ropaMovimientos } from "./ropa-lectura";
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
  prendasList,
  activosList,
  activosGet,
  activosCrear,
  activosActualizar,
  activosCambiarEstado,
  ropaList,
  ropaMovimientos,
  ropaIngresar,
  ropaAjustar,
  entregasList,
  entregarActivo,
  entregarRopa,
  entregasDevolver,
  tallaDePersona,
];
