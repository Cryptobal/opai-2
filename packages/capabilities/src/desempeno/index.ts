// Módulo Desempeño (ADR-094, CAR-306): scorecard por cargo y resultado por persona. Los indicadores
// vienen del catálogo del núcleo (CAR-305) y quién ve a quién, de la jefatura por cargo (CAR-314).
import type { Capacidad } from "../types";
import { periodosCerrar, periodosList, trabajoCierreAutomatico } from "./cierre";
import { propiosArchivar } from "./propios-archivar";
import { propiosGuardar } from "./propios-guardar";
import { hechosList, propiosList } from "./propios-lectura";
import { resultadosPersona } from "./resultados";
import { resultadosCargo } from "./resultados-cargo";
import { scorecardsGuardar } from "./scorecards-guardar";
import { scorecardsGet, scorecardsList } from "./scorecards-lectura";

export { ajustesDesempeno } from "./ajustes";
export { PERMISOS_DESEMPENO } from "./comun";

/** Trabajos del módulo: el cierre automático del mes anterior (CAR-322). */
export const trabajosDesempeno = [trabajoCierreAutomatico];

export const capacidadesDesempeno: readonly Capacidad[] = [
  scorecardsList,
  scorecardsGet,
  scorecardsGuardar,
  resultadosPersona,
  resultadosCargo,
  hechosList,
  propiosList,
  propiosGuardar,
  propiosArchivar,
  periodosList,
  periodosCerrar,
];
