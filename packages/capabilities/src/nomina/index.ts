// Capacidades del módulo Nómina (Brief 25 · PR 1): períodos, novedades, préstamos con plan de cuotas,
// anticipo quincenal, conceptos y calendario de obligaciones. Sin cálculo de liquidaciones (PR 2). Se
// exponen igual en UI, API /api/v1 y MCP (ADR-004, ADR-055).
import type { Capacidad } from "../types";
import { anticiposReglaFijar, anticiposReglasListar } from "./anticipos";
import { anticiposGenerar, prestamosAplicarCuotas } from "./automaticas";
import { conceptosActualizar, conceptosCrear, conceptosListar } from "./conceptos";
import { novedadesAnular, novedadesCargar, novedadesCrear } from "./novedades-escritura";
import { novedadesListar } from "./novedades-lectura";
import { obligacionesActualizar, obligacionesGenerarCalendario, obligacionesListar } from "./obligaciones";
import { periodosAbrir, periodosCambiarEstado, periodosMarcarPagado } from "./periodos-escritura";
import { periodosListar } from "./periodos-lectura";
import { prestamosCancelar, prestamosCrear } from "./prestamos-escritura";
import { prestamosListar } from "./prestamos-lectura";

export { ajustesNomina } from "./ajustes";

export const capacidadesNomina: readonly Capacidad[] = [
  periodosListar,
  periodosAbrir,
  periodosCambiarEstado,
  periodosMarcarPagado,
  novedadesListar,
  novedadesCrear,
  novedadesCargar,
  novedadesAnular,
  prestamosListar,
  prestamosCrear,
  prestamosCancelar,
  prestamosAplicarCuotas,
  anticiposReglasListar,
  anticiposReglaFijar,
  anticiposGenerar,
  conceptosListar,
  conceptosCrear,
  conceptosActualizar,
  obligacionesListar,
  obligacionesGenerarCalendario,
  obligacionesActualizar,
];
