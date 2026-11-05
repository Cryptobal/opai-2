// Capacidades de Rendiciones (CAR-175, ADR-004/ADR-048). Se exponen igual en UI, API /api/v1 y MCP.
import type { Capacidad } from "@opai/capabilities";

import { kilometrajeCalcular } from "./calcular";
import { rendicionesAprobar, rendicionesDevolver, rendicionesRechazar } from "./decision";
import { rendicionesActualizar, rendicionesCrear } from "./escritura";
import { rendicionesAnular, rendicionesEnviar } from "./flujo";
import { rendicionesListar, rendicionesObtener } from "./lectura";
import { rendicionesDuplicados, rendicionesOpciones } from "./opciones";

export { ajustesRendiciones } from "./ajustes";

export const capacidades: readonly Capacidad[] = [
  rendicionesListar,
  kilometrajeCalcular,
  rendicionesObtener,
  rendicionesOpciones,
  rendicionesDuplicados,
  rendicionesCrear,
  rendicionesActualizar,
  rendicionesEnviar,
  rendicionesAnular,
  rendicionesAprobar,
  rendicionesRechazar,
  rendicionesDevolver,
];
