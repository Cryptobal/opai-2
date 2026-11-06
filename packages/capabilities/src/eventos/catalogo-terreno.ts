import type { EventoDeDominio } from "../module";

/** Eventos de Terreno que emite el núcleo (CAR-78). */
export const EVENTOS_TERRENO: readonly EventoDeDominio[] = [
  {
    id: "core.terreno.hechos_recibidos",
    descripcion: "Un equipo de terreno envió un lote de hechos; trae la instalación y la cuenta por tipo.",
  },
];
