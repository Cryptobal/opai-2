// Capacidades del módulo Nómina (Brief 25 · PR 1): períodos, novedades, préstamos con plan de cuotas,
// anticipo quincenal, conceptos y calendario de obligaciones. Sin cálculo de liquidaciones (PR 2). Se
// exponen igual en UI, API /api/v1 y MCP (ADR-004, ADR-055).
import type { Capacidad } from "../types";
import { anticiposReglaFijar, anticiposReglasListar } from "./anticipos";
import { anticiposGenerar, prestamosAplicarCuotas } from "./automaticas";
import { costoProyectadoListar } from "./costo-proyectado";
import { liquidacionesCalcular } from "./liquidaciones-calcular";
import { liquidacionesListar, liquidacionesObtener } from "./liquidaciones-lectura";
import { liquidacionesMarcarRevisadas } from "./liquidaciones-revisar";
import { f301Generar } from "./f30-1";
import { f29RetencionGenerar } from "./f29";
import { consumidorLiquidacionPublicada } from "./consumidor-liquidacion-publicada";
import { libroRemuneracionesExcel, libroRemuneracionesPdf } from "./libro-remuneraciones";
import { liquidacionesPublicar } from "./liquidaciones-publicar";
import {
  cumplimientoDtMovimientosDatos,
  cumplimientoDtMovimientosExportar,
  cumplimientoDtMovimientosListar,
  cumplimientoDtMovimientosRegistrar,
} from "./cumplimiento-dt/capacidades";
import { lreGenerar } from "./lre";
import { previredGenerar } from "./previred";
import { conceptosActualizar, conceptosCrear, conceptosListar } from "./conceptos";
import { novedadesAnular, novedadesCargar, novedadesCrear } from "./novedades-escritura";
import { novedadesListar } from "./novedades-lectura";
import { obligacionesActualizar, obligacionesGenerarCalendario, obligacionesListar } from "./obligaciones";
import { periodosAbrir, periodosCambiarEstado, periodosMarcarPagado } from "./periodos-escritura";
import { periodosListar } from "./periodos-lectura";
import { prestamosCancelar, prestamosCrear } from "./prestamos-escritura";
import { prestamosListar } from "./prestamos-lectura";

export { ajustesNomina } from "./ajustes";
export { buscadoresNomina } from "./buscadores";

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
  costoProyectadoListar,
  liquidacionesCalcular,
  liquidacionesListar,
  liquidacionesMarcarRevisadas,
  liquidacionesObtener,
  lreGenerar,
  previredGenerar,
  f301Generar,
  f29RetencionGenerar,
  libroRemuneracionesExcel,
  libroRemuneracionesPdf,
  liquidacionesPublicar,
  cumplimientoDtMovimientosListar,
  cumplimientoDtMovimientosExportar,
  cumplimientoDtMovimientosDatos,
  cumplimientoDtMovimientosRegistrar,
];

export const consumidoresNomina = [consumidorLiquidacionPublicada];
