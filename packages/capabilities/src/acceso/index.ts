// Capacidades de Control de acceso (CAR-78 · E4, CAR-474, CAR-478). Se exponen igual en UI, API /api/v1 y MCP (ADR-004, ADR-055).
import type { Capacidad } from "../types";
import { registrosAnular, registrosCerrarBloque, registrosSalida } from "./correcciones";
import { intentosListar } from "./intentos";
import { prerregistrosCancelar, prerregistrosCrear } from "./prerregistros";
import {
  prerregistrosInvitacion,
  prerregistrosListar,
  prerregistrosObtener,
} from "./prerregistros-leer";
import { listasListar, listasQuitar } from "./listas";
import { listasAgregar } from "./listas-agregar";
import { portalRegistrosListar } from "./portal-cliente";
import { portalListasAgregar, portalListasListar, portalListasQuitar } from "./portal-listas";
import { portalVisitasCrear, portalVisitasListar } from "./portal-visitas";
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
  portalRegistrosListar,
  portalListasListar,
  portalListasAgregar,
  portalListasQuitar,
  portalVisitasListar,
  portalVisitasCrear,
];
