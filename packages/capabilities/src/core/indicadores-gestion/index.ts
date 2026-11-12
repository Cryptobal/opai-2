// Indicadores de gestión (ADR-094, CAR-305): catálogo publicado por el núcleo y los módulos, y su
// medición por mes. La configuración por cargo (scorecard) es del módulo Desempeño (CAR-306).
import type { Capacidad } from "../../types";
import { indicadoresGestionCatalogo } from "./catalogo";
import { indicadoresGestionMedir } from "./medir";

export { indicadoresDeclarados, indicadoresDelNucleo } from "./comun";

export const capacidadesIndicadoresGestion: readonly Capacidad[] = [
  indicadoresGestionCatalogo,
  indicadoresGestionMedir,
];
