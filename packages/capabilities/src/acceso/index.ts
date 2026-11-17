// Capacidades de Control de acceso (CAR-78 · E4, CAR-474, CAR-478). Se exponen igual en UI, API /api/v1 y MCP (ADR-004, ADR-055).
import type { Capacidad } from "../types";
import { configCambiar, configObtener } from "./config";
import { registrosAnular, registrosCerrarBloque, registrosSalida } from "./correcciones";
import { intentosListar } from "./intentos";
import { prerregistrosCancelar, prerregistrosCrear } from "./prerregistros";
import {
  prerregistrosInvitacion,
  prerregistrosListar,
  prerregistrosObtener,
} from "./prerregistros-leer";
import { gruposCambiar, gruposListar } from "./grupos-lista";
import { listasAgregar, listasListar, listasQuitar } from "./listas";
import { puntosCambiar, puntosListar } from "./puntos";
import { aparienciaCambiar, aparienciaGet } from "./apariencia";
import { registrosObtener } from "./registro-get";
import { privacidadCartel } from "./privacidad";
import { reportesProbar } from "./reportes";
import { registrosListar } from "./registros";

export const capacidadesAcceso: readonly Capacidad[] = [
  listasListar,
  listasAgregar,
  listasQuitar,
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
  gruposListar,
  gruposCambiar,
  aparienciaGet,
  aparienciaCambiar,
  reportesProbar,
  privacidadCartel,
];

export { trabajoCierreAutomatico } from "./cierre";
export { trabajoReportesAcceso } from "./reportes-trabajo";
export { trabajoRetencionAcceso } from "./retencion-trabajo";
