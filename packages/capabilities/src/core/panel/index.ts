import type { Capacidad } from "../../types";
import { actividadList } from "./actividad";
import { resumenContadores } from "./contadores";
import { inicioIndicadores } from "./indicadores";
import { inicioPendientes } from "./pendientes";

/** Capacidades de las pantallas de la sesión C (Inicio, navegación y actividad de fichas). */
export const capacidadesPanel: readonly Capacidad[] = [
  actividadList,
  resumenContadores,
  inicioPendientes,
  inicioIndicadores,
];
