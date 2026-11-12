import type { Capacidad } from "../../types";
import { actividadList } from "./actividad";
import { resumenContadores } from "./contadores";
import { hiloActividad } from "./hilo-actividad";
import { hiloAgenda } from "./hilo-agenda";
import { inicioIndicadores } from "./indicadores";
import { inicioPendientes } from "./pendientes";

/** Capacidades de las pantallas de la sesión C (Inicio, navegación y actividad de fichas). */
export const capacidadesPanel: readonly Capacidad[] = [
  actividadList,
  resumenContadores,
  inicioPendientes,
  inicioIndicadores,
  hiloActividad,
  hiloAgenda,
];
