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
});
