import type { Capacidad } from "../../types";
import { configBuscar, configGet, configSchema } from "./capacidades";
import { platformAjustesGet, platformAjustesSet } from "./plataforma";
import { configSet } from "./set";

export { defineAjustes, type CampoAjuste, type MetaAjuste } from "./registro";
export { ajuste, valoresEfectivos } from "./valores";
export { campoAjuste } from "./catalogo";

export const capacidadesConfig: readonly Capacidad[] = [
  configSchema,
  configGet,
  configBuscar,
  configSet,
  platformAjustesGet,
  platformAjustesSet,
];
