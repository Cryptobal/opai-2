// Valores por defecto de los márgenes de CPQ (CAR-192). Son ajustes de la empresa (Configuración ›
// CPQ › Márgenes); estos números solo se usan cuando la empresa no fijó nada.

/**
 * PROPUESTO, pendiente de «DECISIÓN CARLOS» en el PR de CAR-192: margen sobre venta con el que nace
 * una cotización. Hasta entonces una cotización nueva ya no queda en 0 %.
 */
export const MARGEN_OBJETIVO_DEFECTO_PCT = 20;
/** Mínimo vigente hasta hoy (10 % sobre venta, cpq.md R35, decidido). */
export const MARGEN_MINIMO_DEFECTO_PCT = 10;
/** Alerta vigente hasta hoy (3 puntos sobre el mínimo, cpq.md R35). */
export const MARGEN_ALERTA_DEFECTO_PUNTOS = 3;

/** 1 % = 10 000 en el motor (100 % = 1 000 000). */
export const PCT_A_ESCALADO = 10_000;

export type MargenesTenant = { objetivoPct: number; minimoPct: number; alertaPct: number };

/** Porcentajes enteros de la empresa → enteros escalados del motor. */
export function margenesEscalados(v: {
  objetivo: number;
  minimo: number;
  alerta: number;
}): MargenesTenant {
  return {
    objetivoPct: v.objetivo * PCT_A_ESCALADO,
    minimoPct: v.minimo * PCT_A_ESCALADO,
    alertaPct: v.alerta * PCT_A_ESCALADO,
  };
}

export const MARGENES_DEFECTO: MargenesTenant = margenesEscalados({
  objetivo: MARGEN_OBJETIVO_DEFECTO_PCT,
  minimo: MARGEN_MINIMO_DEFECTO_PCT,
  alerta: MARGEN_ALERTA_DEFECTO_PUNTOS,
});
