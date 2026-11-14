// Capacidades de Finanzas · Flujo de caja (CAR-91, ADR-004/ADR-026). Misma capacidad en UI, /api/v1 y MCP.
import type { Capacidad } from "@opai/capabilities";

import { ajustesActualizar, ajustesObtener } from "./ajustes";
import { celdasCumplir, celdasFijar } from "./celdas";
import { cobroEsperadoFijar } from "./cobro-esperado";
import { cuadraturaMensualObtener } from "./cuadratura";
import { planillaResumen } from "./resumen";
import { flujoDerivadasListar } from "./derivadas";
import { capacidadesBancos } from "./bancos";
import { filasActualizar, filasArchivar, filasCrear } from "./filas";
import { flujoImportar } from "./importar";
import { impuestosPostergarIva } from "./impuestos-postergar";
import { filasListar, planillaObtener } from "./lectura";
import { celdasMover } from "./mover";
import { recurrentesActualizar, recurrentesCrear, recurrentesListar } from "./recurrentes";
import { recurrentesCambiarDesde } from "./recurrentes-cambio";

export const capacidades: readonly Capacidad[] = [
  planillaObtener,
  filasListar,
  filasCrear,
  filasActualizar,
  filasArchivar,
  celdasFijar,
  celdasMover,
  celdasCumplir,
  cobroEsperadoFijar,
  impuestosPostergarIva,
  ajustesObtener,
  ajustesActualizar,
  flujoImportar,
  flujoDerivadasListar,
  cuadraturaMensualObtener,
  planillaResumen,
  recurrentesListar,
  recurrentesCrear,
  recurrentesActualizar,
  recurrentesCambiarDesde,
  ...capacidadesBancos,
];
