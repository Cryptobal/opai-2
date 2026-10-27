import type { DatoPersonalDeclarado } from "@opai/domain";

import { listarModulos } from "../../module";
import { INVENTARIO_NUCLEO } from "./inventario-nucleo";

// El inventario del Núcleo (RAT, §4.3) vive en `inventario-nucleo.ts` para no superar el límite de
// líneas a medida que se declaran más tablas; aquí solo se consolida con lo de cada módulo.
export { INVENTARIO_NUCLEO };

/** Inventario consolidado: el Núcleo más lo que declara cada módulo en su manifest. */
export const listarInventario = (): DatoPersonalDeclarado[] => [
  ...INVENTARIO_NUCLEO,
  ...listarModulos().flatMap((m) => m.datosPersonales ?? []),
];
