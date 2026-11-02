// Capacidades de Finanzas · Flujo de caja (CAR-91, ADR-004/ADR-026). Misma capacidad en UI, /api/v1 y MCP.
import type { Capacidad } from "@opai/capabilities";

import { ajustesActualizar, ajustesObtener } from "./ajustes";
import { celdasCumplir, celdasFijar } from "./celdas";
import { cierreReabrir, cierresListar, cierreSellar } from "./cierre";
import { flujoDerivadasListar } from "./derivadas";
import { capacidadesBancos } from "./bancos";
import { filasActualizar, filasArchivar, filasCrear } from "./filas";
import { flujoImportar } from "./importar";
import { filasListar, planillaObtener } from "./lectura";
import { celdasMover } from "./mover";

export const capacidades: readonly Capacidad[] = [
  planillaObtener,
  filasListar,
  filasCrear,
  filasActualizar,
  filasArchivar,
  celdasFijar,
  celdasMover,
  celdasCumplir,
  cierresListar,
  cierreSellar,
  cierreReabrir,
  ajustesObtener,
  ajustesActualizar,
  flujoImportar,
  flujoDerivadasListar,
  ...capacidadesBancos,
];
