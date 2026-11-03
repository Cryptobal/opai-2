import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

const COTIZACION = v("cotizacion.codigo", "texto", "CPQ-2026-042", "Código de la cotización.");
const SOLICITANTE = v("solicitante.nombre", "texto", "Ana Prueba", "Quien pidió la aprobación o el envío.");
const RESUMEN = v("resumen", "texto", "Margen bajo el mínimo · CPQ-2026-042", "Texto breve del pendiente.");
const MOTIVO = v("motivo", "texto", "Ajustar precio antes de enviar.", "Motivo del rechazo, si aplica.");

/** Eventos CPQ que alimentan Comunicaciones (ADR-020) y variables del consumidor de bandeja. */
export const COMUNICABLES_CPQ: readonly EventoComunicable[] = [
  {
    evento: "cpq.cotizacion.aprobacion_solicitada",
    nombre: "Cotización pendiente de aprobación de margen",
    descripcion: "Una cotización pasó a en_aprobacion por margen bajo o subvaloración.",
    transaccional: false,
    variables: [COTIZACION, SOLICITANTE, RESUMEN, EMPRESA, URL("Bandeja de aprobaciones.")],
    plantillas: {
      inapp: {
        asunto: "Margen por aprobar · {{cotizacion.codigo}}",
        cuerpo: "{{resumen}}",
      },
    },
  },
  {
    evento: "cpq.envio_propuesta.solicitado",
    nombre: "Envío conjunto pendiente de aprobación",
    descripcion: "Un envío de cotización y/o propuesta técnica quedó pendiente de aprobación.",
    transaccional: false,
    variables: [COTIZACION, SOLICITANTE, RESUMEN, EMPRESA, URL("Bandeja de aprobaciones.")],
    plantillas: {
      inapp: {
        asunto: "Envío por aprobar · {{cotizacion.codigo}}",
        cuerpo: "{{resumen}}",
      },
    },
  },
  {
    evento: "cpq.cotizacion.aprobada",
    nombre: "Margen de cotización aprobado",
    descripcion: "Se aprobó el margen de una cotización que estaba en aprobación.",
    transaccional: false,
    variables: [COTIZACION, EMPRESA, URL("Ficha de la cotización.")],
    plantillas: {
      inapp: {
        asunto: "Margen aprobado · {{cotizacion.codigo}}",
        cuerpo: "Tu pedido de aprobación de margen fue aprobado.",
      },
    },
  },
  {
    evento: "cpq.cotizacion.aprobacion_rechazada",
    nombre: "Margen de cotización rechazado",
    descripcion: "Se rechazó la aprobación de margen de una cotización.",
    transaccional: false,
    variables: [COTIZACION, MOTIVO, EMPRESA, URL("Ficha de la cotización.")],
    plantillas: {
      inapp: {
        asunto: "Margen rechazado · {{cotizacion.codigo}}",
        cuerpo: "{{motivo}}",
      },
    },
  },
];
