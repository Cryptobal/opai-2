// Capacidades de Rendiciones (CAR-175, ADR-004/ADR-048). Se exponen igual en UI, API /api/v1 y MCP.
import type { Capacidad } from "@opai/capabilities";

import { rendicionesAdministrador } from "./administrador";
import { respaldoDescargar } from "./respaldo";
import { kilometrajeCalcular } from "./calcular";
import { rendicionesAprobar, rendicionesDevolver, rendicionesRechazar } from "./decision";
import { rendicionesActualizar, rendicionesCrear } from "./escritura";
import { rendicionesAnular, rendicionesEnviar } from "./flujo";
import { rendicionesListar, rendicionesObtener } from "./lectura";
import { rendicionesDuplicados } from "./duplicados";
import { rendicionesOpciones } from "./opciones";

export { ajustesRendiciones } from "./ajustes";

export const capacidades: readonly Capacidad[] = [
  rendicionesListar,
  kilometrajeCalcular,
  rendicionesObtener,
  rendicionesOpciones,
  rendicionesDuplicados,
  rendicionesAdministrador,
  respaldoDescargar,
  rendicionesCrear,
  rendicionesActualizar,
  rendicionesEnviar,
  rendicionesAnular,
  rendicionesAprobar,
  rendicionesRechazar,
  rendicionesDevolver,
];
