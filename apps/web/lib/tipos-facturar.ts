import type { RequisitoFacturar } from "@opai/domain";

/** «Lista para facturar» o lo que falta, en cada fila de `core.cuentas.list` (CAR-156). */
export type ConFacturar<T> = T & { facturar?: { lista: boolean; faltan: RequisitoFacturar[] } };
