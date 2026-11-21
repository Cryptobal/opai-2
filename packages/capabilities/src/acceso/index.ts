// Capacidades de Control de acceso (CAR-78 · E4, CAR-474, CAR-478). Se exponen igual en UI, API /api/v1 y MCP (ADR-004, ADR-055).
import type { Capacidad } from "../types";
import { configCambiar, configObtener } from "./config";
import { registrosAnular, registrosCerrarBloque, registrosSalida } from "./correcciones";
import { gruposCambiar, gruposListar } from "./grupos-lista";
import { intentosListar } from "./intentos";
import { listasAgregar } from "./listas-agregar";
import { listasListar, listasQuitar } from "./listas";
import { portalRegistrosListar } from "./portal-cliente";
import { portalListasAgregar, portalListasListar, portalListasQuitar } from "./portal-listas";
import { portalVisitasCrear, portalVisitasListar } from "./portal-visitas";
import { aparienciaCambiar, aparienciaGet } from "./apariencia";
import { privacidadCartel } from "./privacidad";
import {
  prerregistrosInvitacion,
  prerregistrosListar,
  prerregistrosObtener,
} from "./prerregistros-leer";
import { prerregistrosCancelar, prerregistrosCrear } from "./prerregistros";
import { puntosCambiar, puntosListar } from "./puntos";
import { registrosObtener } from "./registro-get";
import { registrosListar } from "./registros";
import { reportesProbar } from "./reportes";

export const capacidadesAcceso: readonly Capacidad[] = [
  listasListar,
  listasAgregar,
  listasQuitar,
  gruposListar,
  gruposCambiar,
  registrosListar,
  registrosObtener,
  intentosListar,
  registrosAnular,
  registrosSalida,
  registrosCerrarBloque,
  prerregistrosListar,
  prerregistrosObtener,
  prerregistrosCrear,
  prerregistrosCancelar,
  prerregistrosInvitacion,
  configObtener,
  configCambiar,
  puntosListar,
  puntosCambiar,
  aparienciaGet,
  aparienciaCambiar,
  portalRegistrosListar,
  portalListasListar,
  portalListasAgregar,
  portalListasQuitar,
  portalVisitasListar,
  portalVisitasCrear,
  reportesProbar,
  privacidadCartel,
];

export { trabajoCierreAutomatico } from "./cierre";
export { trabajoReportesAcceso } from "./reportes-trabajo";
export { trabajoRetencionAcceso } from "./retencion-trabajo";