import type { FilaFlujo } from "../domain";
import type { filaSchema } from "./esquemas";
import type { z } from "zod";

/**
 * Filas del sistema que no se guardan: reciben lo real de la cartola que no tiene una fila
 * propia (hallazgos 3, 4 y 8 de CAR-181). Leer la planilla nunca escribe en la base.
 */
export const FILA_SIN_CLASIFICAR_INGRESO = "00000000-0000-4000-8000-000000000001";
export const FILA_SIN_CLASIFICAR_EGRESO = "00000000-0000-4000-8000-000000000002";

export const FILAS_VIRTUALES_DOMINIO: FilaFlujo[] = [
  { id: FILA_SIN_CLASIFICAR_INGRESO, seccion: "ingreso", arrastre: false },
  { id: FILA_SIN_CLASIFICAR_EGRESO, seccion: "egreso", arrastre: false },
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
];
