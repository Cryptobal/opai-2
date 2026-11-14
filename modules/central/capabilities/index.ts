import { alertasAbrir } from "./abrir";
import {
  alertasFalsaAlarma,
  alertasPosponer,
  alertasReabrir,
  alertasResolver,
} from "./escritura";
import { alertasListar, alertasObtener, centralEstado } from "./lectura";

/** Capacidades de la Central. Cada una se expone igual en UI, API /api/v1 y MCP (ADR-004). */
export const capacidades = [
  centralEstado,
  alertasListar,
  alertasObtener,
  alertasAbrir,
  alertasResolver,
  alertasFalsaAlarma,
  alertasReabrir,
  alertasPosponer,
];
