// Capacidades del módulo Pauta (Operaciones, Brief 11b · PR 1). Se exponen igual en UI, API /api/v1
// y MCP (ADR-004, ADR-055). El manifest de modules/pauta las lista; el registro las da de alta al
// arrancar. La Diaria, los reemplazos, los refuerzos y el cruce con marcas llegan en el PR 2.
import type { Capacidad } from "../types";
import { excepcionesAnular } from "./excepciones-anular";
import { excepcionesCrear } from "./excepciones-crear";
import { historialListar } from "./historial";
import { mesLeer } from "./lectura-mes";
import { ppcListar, resumenLeer } from "./lectura-resumen";
import { seriesFijar } from "./series";

export const capacidadesPauta: readonly Capacidad[] = [
  mesLeer,
  resumenLeer,
  ppcListar,
  historialListar,
  seriesFijar,
  excepcionesCrear,
  excepcionesAnular,
];
