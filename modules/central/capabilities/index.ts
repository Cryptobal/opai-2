import { alertasAbrir } from "./abrir";
import { alertasContactar, alertasEscalar, alertasHacerseCargo } from "./atencion";
import { cadenasGuardar, cadenasListar } from "./cadenas";
import { reglasGuardar, reglasListar } from "./reglas";
import {
  alertasFalsaAlarma,
  alertasPosponer,
  alertasReabrir,
  alertasResolver,
} from "./escritura";
import { centralEstado } from "./estado";
import { alertasListar, alertasObtener } from "./lectura";

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
  alertasHacerseCargo,
  alertasContactar,
  alertasEscalar,
  cadenasListar,
  cadenasGuardar,
  reglasListar,
  reglasGuardar,
];
