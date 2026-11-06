import type { FilaFlujo } from "../domain";
import type { filaSchema } from "./esquemas";
import type { z } from "zod";

/**
 * Filas del sistema que no se guardan: reciben lo real de la cartola que no tiene una fila
 * propia (hallazgos 3, 4 y 8 de CAR-181). Leer la planilla nunca escribe en la base.
 */
export const FILA_SIN_CLASIFICAR_INGRESO = "00000000-0000-4000-8000-000000000001";
export const FILA_SIN_CLASIFICAR_EGRESO = "00000000-0000-4000-8000-000000000002";
/** Movimientos de la cartola que todavía no están conciliados (semanas pasadas, ADR-073). */
export const FILA_SIN_CONCILIAR_INGRESO = "00000000-0000-4000-8000-000000000003";
export const FILA_SIN_CONCILIAR_EGRESO = "00000000-0000-4000-8000-000000000004";

/** Cobros esperados de las facturas por cobrar, con la fecha esperada de cobro (ADR-073). */
export const FILA_COBROS_ESPERADOS = "00000000-0000-4000-8000-000000000005";

export const FILAS_VIRTUALES_DOMINIO: FilaFlujo[] = [
  { id: FILA_SIN_CLASIFICAR_INGRESO, seccion: "ingreso", arrastre: false },
  { id: FILA_SIN_CLASIFICAR_EGRESO, seccion: "egreso", arrastre: false },
  { id: FILA_SIN_CONCILIAR_INGRESO, seccion: "ingreso", arrastre: false },
  { id: FILA_SIN_CONCILIAR_EGRESO, seccion: "egreso", arrastre: false },
  { id: FILA_COBROS_ESPERADOS, seccion: "ingreso", arrastre: false },
];

export const FILAS_VIRTUALES_VISTA: z.infer<typeof filaSchema>[] = [
  {
    id: FILA_SIN_CLASIFICAR_INGRESO,
    seccion: "ingreso",
    etiqueta: "Sin clasificar (ingresos)",
    vinculo: null,
    arrastre: false,
    orden: 9998,
    activa: true,
  },
  {
    id: FILA_SIN_CLASIFICAR_EGRESO,
    seccion: "egreso",
    etiqueta: "Sin clasificar (egresos)",
    vinculo: null,
    arrastre: false,
    orden: 9999,
    activa: true,
  },
  {
    id: FILA_SIN_CONCILIAR_INGRESO,
    seccion: "ingreso",
    etiqueta: "Sin conciliar (ingresos)",
    vinculo: null,
    arrastre: false,
    orden: 9996,
    activa: true,
  },
  {
    id: FILA_SIN_CONCILIAR_EGRESO,
    seccion: "egreso",
    etiqueta: "Sin conciliar (egresos)",
    vinculo: null,
    arrastre: false,
    orden: 9997,
    activa: true,
  },
  {
    id: FILA_COBROS_ESPERADOS,
    seccion: "ingreso",
    etiqueta: "Cobros esperados (facturas)",
    vinculo: "finanzas:ventas",
    arrastre: false,
    orden: 9990,
    activa: true,
  },
];
