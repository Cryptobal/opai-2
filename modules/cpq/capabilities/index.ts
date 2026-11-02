// Capacidades de CPQ (CAR-119, ADR-004/ADR-042). Se exponen igual en UI, API /api/v1 y MCP.
import type { Capacidad } from "@opai/capabilities";

import { motorSimular } from "./motor";
import { cotizacionesCreate } from "./crear";
import { cotizacionesCalcular, cotizacionesFicha } from "./ficha";
import { cotizacionesGet, cotizacionesList } from "./lectura";
import { lineasActualizar, lineasCrear, lineasQuitar, lineasReordenar } from "./lineas";
import { seccionMargenActualizar, versionMargenActualizar } from "./margen";

export const capacidades: readonly Capacidad[] = [
  motorSimular,
  cotizacionesList,
  cotizacionesGet,
  cotizacionesCreate,
  cotizacionesCalcular,
  cotizacionesFicha,
  lineasCrear,
  lineasActualizar,
  lineasQuitar,
  lineasReordenar,
  versionMargenActualizar,
  seccionMargenActualizar,
];
