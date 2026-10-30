import type { Capacidad } from "@opai/capabilities";

import { misDatosActualizar, misDatosObtener } from "./mis-datos";
import { privacidadObtener } from "./privacidad";
import { preferenciasActualizar, preferenciasObtener } from "./preferencias";

/** Capacidades del propio trabajador (Brief 15 · PR 1). Cada una se expone igual en UI, API y MCP. */
export const capacidades: readonly Capacidad[] = [
  misDatosObtener,
  misDatosActualizar,
  preferenciasObtener,
  preferenciasActualizar,
  privacidadObtener,
];
