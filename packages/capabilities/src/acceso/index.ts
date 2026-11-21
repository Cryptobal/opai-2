// Capacidades de Control de acceso (CAR-78 · E4, CAR-474, CAR-478). Se exponen igual en UI, API /api/v1 y MCP (ADR-004, ADR-055).
import type { Capacidad } from "../types";
import { configCambiar, configObtener } from "./config";
import { registrosAnular, registrosCerrarBloque, registrosSalida } from "./correcciones";
import { intentosListar } from "./intentos";
import { listasAgregar, listasListar, listasQuitar } from "./listas";
import { portalRegistrosListar } from "./portal-cliente";
import { portalListasAgregar, portalListasListar, portalListasQuitar } from "./portal-listas";
import {
  prerregistrosInvitacion,
  prerregistrosListar,
  prerregistrosObtener,
} from "./prerregistros-leer";
import { prerregistrosCancelar, prerregistrosCrear } from "./prerregistros";
import { registrosObtener } from "./registro-get";
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
  portalRegistrosListar,
  portalListasListar,
  portalListasAgregar,
  portalListasQuitar,
];

export { trabajoCierreAutomatico } from "./cierre";
