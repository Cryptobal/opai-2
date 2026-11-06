import type { EventoDeDominio } from "../module";

/** Eventos de las pruebas de módulo (CAR-188 PR 2) y de la prueba gratis por empresa (CAR-222). */
export const EVENTOS_COBROS: readonly EventoDeDominio[] = [
  {
    id: "core.cobros.prueba_por_vencer",
    descripcion: "Una prueba de módulo vence en siete días: aviso a Plataforma.",
  },
  {
    id: "core.cobros.prueba_vencida",
    descripcion: "Una prueba de módulo venció: pasó a cobro o quedó en solo lectura.",
  },
  {
    id: "core.prueba_gratis.activada",
    descripcion: "Una empresa activó su prueba gratis de un módulo o de una parte de Finanzas.",
  },
  {
    id: "core.prueba_gratis.vencida",
    descripcion: "Terminó la prueba gratis de una empresa: el módulo quedó en solo lectura.",
  },
];
