import type { Capacidad } from "../../types";
import { camposCatalogo } from "./catalogo";
import { camposResolver } from "./resolver";

/** Catálogo único de campos y resolvedor autorizado (CAR-138, PR 2). */
export const capacidadesCampos: readonly Capacidad[] = [camposCatalogo, camposResolver];
