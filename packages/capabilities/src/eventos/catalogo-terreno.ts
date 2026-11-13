import type { EventoDeDominio } from "../module";

/** Eventos de Terreno que emite el núcleo (CAR-78). */
export const EVENTOS_TERRENO: readonly EventoDeDominio[] = [
  {
    id: "core.terreno.panico",
    descripcion:
      "Un guardia apretó el botón de pánico en la app de terreno; trae la instalación, la persona y el id del pánico (CAR-293/296).",
  },
  {
    id: "core.terreno.hechos_recibidos",
    descripcion:
      "Un equipo de terreno envió un lote de hechos; trae la instalación y la cuenta por tipo.",
  },
  {
    id: "core.biometria.enrolado",
    descripcion:
      "Una persona quedó con su rostro enrolado para el reconocimiento facial; trae el proveedor.",
  },
  {
    id: "core.biometria.borrado",
    descripcion:
      "Se borró el rostro enrolado de una persona (a pedido o por revocar su consentimiento); trae el motivo.",
  },
  {
    id: "core.biometria.anonimizacion_pendiente",
    descripcion:
      "Se anonimizó a una persona con el rostro enrolado: hay que borrar su rostro en el proveedor y la referencia local.",
  },
];
