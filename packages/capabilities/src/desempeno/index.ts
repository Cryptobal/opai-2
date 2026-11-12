// Módulo Desempeño (ADR-094, CAR-306): scorecard por cargo y resultado por persona. Los indicadores
// vienen del catálogo del núcleo (CAR-305) y quién ve a quién, de la jefatura por cargo (CAR-314).
import type { Capacidad } from "../types";
import { propiosArchivar } from "./propios-archivar";
import { propiosGuardar } from "./propios-guardar";
import { hechosList, propiosList } from "./propios-lectura";
import { resultadosCargo, resultadosPersona } from "./resultados";
import { scorecardsGuardar } from "./scorecards-guardar";
import { scorecardsGet, scorecardsList } from "./scorecards-lectura";

export { PERMISOS_DESEMPENO } from "./comun";

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
];
