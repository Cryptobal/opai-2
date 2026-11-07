// Capacidades del módulo Portal Cliente (Brief 16 · PR 1, CAR-88). Se exponen igual en UI, API
// /api/v1 y MCP (ADR-004, ADR-055). El manifest de modules/portal_cliente las lista.
import type { Capacidad } from "../types";
import { accesosCandidatos, accesosListar } from "./accesos";
import { accesosActualizar } from "./accesos-actualizar";
import { accesosVincular } from "./accesos-vincular";
import { configActualizar, configLeer } from "./config";
import { contactosAccesoDar, contactosAccesoListar } from "./contactos-acceso";
import { miAcceso, resumenLeer } from "./portal";

export { ajustesPortalCliente } from "./ajustes";

export const capacidadesPortalCliente: readonly Capacidad[] = [
  accesosListar,
  accesosCandidatos,
  accesosVincular,
  accesosActualizar,
  contactosAccesoListar,
  contactosAccesoDar,
  configLeer,
  configActualizar,
  miAcceso,
  resumenLeer,
];
