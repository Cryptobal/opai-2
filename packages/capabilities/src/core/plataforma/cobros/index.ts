import type { Capacidad } from "../../../types";
import {
  platformCobrosCargoAnular,
  platformCobrosCargosGenerar,
  platformCobrosCargosList,
} from "./cargos";
import { platformCobrosCondicionesSet } from "./condiciones";
import { platformCobrosPruebaAbrir } from "./prueba";
import { platformCobrosResumen } from "./resumen";

export { trabajoCobrosMesAnterior } from "./trabajo";
export { trabajoCobrosPruebas } from "./trabajo-pruebas";

/** Cobro por módulo (CAR-188, ADR-071, BRIEF-35). */
export const capacidadesCobros: readonly Capacidad[] = [
  platformCobrosResumen,
  platformCobrosCondicionesSet,
  platformCobrosCargosGenerar,
  platformCobrosCargosList,
  platformCobrosCargoAnular,
  platformCobrosPruebaAbrir,
];
