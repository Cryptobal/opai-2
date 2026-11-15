// CAR-350/CAR-387 (Estándares P-1): gerente, lector y supervisor se definen por lista explícita,
// no por «todo menos…» ni por comodín de módulo.
import { CLASES_MODULOS } from "./permisos-base-modulos";
import { CLASES_NUCLEO } from "./permisos-base-nucleo";
import type { ClaseBase } from "./permisos-base-tipos";

export type { ClaseBase } from "./permisos-base-tipos";

/** Clase de cada permiso conocido (núcleo y módulos) para gerente, lector y supervisor. */
export const CLASES_BASE: Readonly<Record<string, ClaseBase>> = {
  ...CLASES_NUCLEO,
  ...CLASES_MODULOS,
};

const con = (letra: "G" | "L" | "S") =>
  Object.entries(CLASES_BASE)
    .filter(([, c]) => c.includes(letra))
    .map(([p]) => p);

/** Permisos que recibe el rol gerente. Un permiso nuevo no entra hasta que alguien lo clasifica. */
export const PERMISOS_GERENTE: readonly string[] = con("G");
/** Permisos que recibe el rol lector (viewer). */
export const PERMISOS_LECTOR: readonly string[] = con("L");
/** Permisos que recibe el rol supervisor (CAR-387): sin comodines de Operaciones, Rondas, Pauta ni Tickets. */
export const PERMISOS_SUPERVISOR: readonly string[] = con("S");
