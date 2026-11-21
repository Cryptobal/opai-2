import type { DatoPersonalDeclarado } from "@opai/domain";

import { listarModulos } from "../../module";
import { INVENTARIO_NUCLEO as INVENTARIO_BASE } from "./inventario-nucleo";
import { INVENTARIO_PERSONAS_PR2 } from "./inventario-nucleo-personas-pr2";
import { INVENTARIO_RETENCION } from "./inventario-retencion";
import { INVENTARIO_AGENTES } from "./inventario-agentes";
import { INVENTARIO_AUSENCIAS } from "./inventario-ausencias";
import { INVENTARIO_UNIFORME } from "./inventario-uniforme";
import { INVENTARIO_OAUTH } from "./inventario-oauth";
import { INVENTARIO_SII } from "./inventario-sii";
import { INVENTARIO_ACCESO } from "./inventario-acceso";

// El inventario del Núcleo (RAT, §4.3) vive en `inventario-nucleo.ts` para no superar el límite de
// líneas a medida que se declaran más tablas; aquí solo se consolida con lo de cada módulo.
export const INVENTARIO_NUCLEO: DatoPersonalDeclarado[] = [
  ...INVENTARIO_BASE,
  ...INVENTARIO_PERSONAS_PR2,
  ...INVENTARIO_AUSENCIAS,
  ...INVENTARIO_UNIFORME,
  ...INVENTARIO_RETENCION,
  ...INVENTARIO_AGENTES,
  ...INVENTARIO_SII,
  ...INVENTARIO_OAUTH,
];

const inventarioAccesoEfectivo = (): DatoPersonalDeclarado[] => {
  const declarado = listarModulos()
    .filter((m) => m.id === "acceso")
    .flatMap((m) => m.datosPersonales ?? []);
  return declarado.length ? declarado : INVENTARIO_ACCESO;
};

/** Inventario consolidado: el Núcleo más lo que declara cada módulo en su manifest. */
export const listarInventario = (): DatoPersonalDeclarado[] => [
  ...INVENTARIO_NUCLEO,
  ...listarModulos()
    .filter((m) => m.id !== "acceso")
    .flatMap((m) => m.datosPersonales ?? []),
  ...inventarioAccesoEfectivo(),
];
