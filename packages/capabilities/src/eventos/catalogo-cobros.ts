import type { EventoDeDominio } from "../module";

/** Eventos de las pruebas de módulo (CAR-188 PR 2). */
export const EVENTOS_COBROS: readonly EventoDeDominio[] = [
  {
    id: "core.cobros.prueba_por_vencer",
    descripcion: "Una prueba de módulo vence en siete días: aviso a Plataforma.",
  },
  {
    id: "core.cobros.prueba_vencida",
    descripcion: "Una prueba de módulo venció: pasó a cobro o quedó en solo lectura.",
  },
];
