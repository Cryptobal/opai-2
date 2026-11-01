import type { Capacidad } from "@opai/capabilities";

import { arcoListar } from "./arco-listar";
import { arcoSolicitar } from "./arco-solicitar";
import { misDatosActualizar, misDatosObtener } from "./mis-datos";
import { misDatosExportar } from "./mis-datos-exportar";
import { privacidadObtener } from "./privacidad";
import { preferenciasActualizar, preferenciasObtener } from "./preferencias";

/** Capacidades del propio trabajador (Brief 15). Cada una se expone igual en UI, API y MCP. */
export const capacidades: readonly Capacidad[] = [
  misDatosObtener,
  misDatosActualizar,
  misDatosExportar,
  preferenciasObtener,
  preferenciasActualizar,
  privacidadObtener,
  arcoListar,
  arcoSolicitar,
];
