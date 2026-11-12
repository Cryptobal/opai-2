import { z } from "zod";

// Ajustes del módulo Comercial (ADR-008). Viven junto a las capacidades para que el manifest y los
// tests registren el mismo esquema: `ajuste()` falla si el ajuste no está declarado, y ganar lee
// `ganar_exige_cotizacion` sin respaldo (falla cerrado). El embudo y los catálogos se editan con
// sus capacidades (comercial.config.*); aquí viven las reglas conmutables del módulo.
export const ajustesComercial = z.object({
  ganar_exige_cotizacion: z.boolean().default(false).meta({
    etiqueta: "Ganar exige cotización enviada",
    ayuda:
      "Apagado hasta que exista CPQ: se puede ganar sin cotización (decisión de Carlos, 26-oct-2026).",
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
      "Apagado por defecto (decisión de Carlos, 25-oct-2026). El correo sale por Comunicaciones; en el PR 1 aún no hay canal de entrada que lo dispare.",
    grupo: "Leads",
    ambito: "tenant",
    permiso: "comercial:canales.manage",
    control: "switch",
  }),
  solicitudes_primera_respuesta_horas: z.number().int().min(0).max(720).default(0).meta({
    etiqueta: "Tiempo objetivo de primera respuesta (horas)",
    ayuda:
      "Apagado con 0 (decisión de Carlos, 11-nov-2026). Con un valor, la bandeja de Solicitudes marca cuáles están dentro o fuera del plazo y el tablero de reportes mide cuántas se atendieron a tiempo.",
    grupo: "Leads",
    ambito: "tenant",
    permiso: "comercial:config.manage",
    control: "numero",
  }),
});
