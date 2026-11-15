import { z } from "zod";

// Ajustes del módulo Comercial (ADR-008). Viven junto a las capacidades para que el manifest y los
// tests registren el mismo esquema: `ajuste()` falla si el ajuste no está declarado, y ganar lee
// `ganar_exige_cotizacion` sin respaldo (falla cerrado). El embudo y los catálogos se editan con
// sus capacidades (comercial.config.*); aquí viven las reglas conmutables del módulo.
export const ajustesComercial = z.object({
  ganar_exige_cotizacion: z.boolean().default(false).meta({
    etiqueta: "Ganar exige cotización enviada",
    ayuda:
      "Apagado por defecto. Encendido, no se puede marcar un negocio como ganado sin una cotización enviada al cliente.",
    grupo: "Negocios",
    ambito: "tenant",
    permiso: "comercial:config.manage",
    control: "switch",
  }),
  avisar_ganar_sin_cotizacion: z.boolean().default(true).meta({
    etiqueta: "Avisar al ganar sin cotización",
    ayuda: "Muestra un aviso «sin cotización» en la vista previa y al confirmar.",
    grupo: "Negocios",
    ambito: "tenant",
    permiso: "comercial:config.manage",
    control: "switch",
  }),
  seguimiento_aviso_responsable: z.boolean().default(false).meta({
    etiqueta: "Avisar al vendedor cuando el cliente responde",
    ayuda:
      "Apagado por defecto (ADR-020): con el aviso encendido, el vendedor del negocio recibe una notificación en OPAI cuando su cliente responde un seguimiento o cuando OPAI cierra el negocio sin respuesta.",
    grupo: "Seguimiento",
    ambito: "tenant",
    permiso: "comercial:config.manage",
    control: "switch",
  }),
  solicitudes_acuse_recibo: z.boolean().default(false).meta({
    etiqueta: "Enviar acuse de recibo al recibir una solicitud",
    ayuda:
      "Apagado por defecto. Encendido, al recibir una solicitud OPAI envía un correo de acuse al solicitante por Comunicaciones.",
    grupo: "Leads",
    ambito: "tenant",
    permiso: "comercial:canales.manage",
    control: "switch",
  }),
  solicitudes_primera_respuesta_horas: z.number().int().min(0).max(720).default(0).meta({
    etiqueta: "Tiempo objetivo de primera respuesta (horas hábiles)",
    ayuda:
      "0 lo desactiva. Con un valor, se cuenta en horas hábiles (lunes a viernes, de 8:00 a 18:00): la bandeja de Solicitudes marca cuáles están dentro o fuera del plazo y los reportes miden cuántas se atendieron a tiempo.",
    grupo: "Leads",
    ambito: "tenant",
    permiso: "comercial:config.manage",
    control: "numero",
  }),
});
