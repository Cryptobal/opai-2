// Capacidades del módulo CPQ (Brief 10 · PR 10.1). Se exponen igual en UI, API /api/v1 y MCP
// (ADR-004, ADR-055); cada escritura tiene su `preview_`. El manifest de modules/cpq las lista. Las
// de aprobar y rechazar márgenes (soloPersonas), enviar, versionar y configurar el modelo llegan en
// los PR 10.3 a 10.7.
import type { Capacidad } from "../types";
import { cotizacionesAjustar } from "./ajustar";
import { cotizacionesCreate } from "./cotizaciones-crear";
import { cotizacionesGet, cotizacionesList } from "./cotizaciones-lectura";

export const capacidadesCpq: readonly Capacidad[] = [
  cotizacionesList,
  cotizacionesGet,
  cotizacionesCreate,
  cotizacionesAjustar,
];
