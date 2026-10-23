import type { Capacidad } from "../../types";
import { aprobacionesGet, aprobacionesList } from "./aprobaciones";
import {
  aprobacionesAprobar,
  aprobacionesRechazar,
  trabajoExpirarAprobaciones,
} from "./aprobaciones-resolver";
import { apikeysSetAutonomia, apikeysUpdate } from "./claves";

export const trabajosAgentes = [trabajoExpirarAprobaciones];

/** Agentes (Brief 02, bloque 9; ADR-032): presupuesto, autonomía y cola de aprobaciones. */
export const capacidadesAgentes: readonly Capacidad[] = [
  apikeysUpdate,
  apikeysSetAutonomia,
  aprobacionesList,
  aprobacionesGet,
  aprobacionesAprobar,
  aprobacionesRechazar,
];
