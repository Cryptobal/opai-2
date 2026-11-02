// Capacidades de CPQ (CAR-119, ADR-004/ADR-042). Se exponen igual en UI, API /api/v1 y MCP.
import type { Capacidad } from "@opai/capabilities";

import { motorSimular } from "./motor";
import { cotizacionesCreate } from "./crear";
import { cotizacionesGet, cotizacionesList } from "./lectura";

export const capacidades: readonly Capacidad[] = [
  motorSimular,
  cotizacionesList,
  cotizacionesGet,
  cotizacionesCreate,
];
