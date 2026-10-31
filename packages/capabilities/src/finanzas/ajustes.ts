import { z } from "zod";

// Ajustes del módulo Finanzas (ADR-018, ADR-021). El centro de configuración del núcleo los dibuja en
// Configuración › Módulos › Finanzas. Solo owner y admin los ven (Finanzas es bloqueo financiero).
export const ajustesFinanzas = z.object({
  plazo_pago_defecto_dias: z
    .number()
    .int()
    .min(0)
    .max(365)
    .default(30)
    .meta({
      etiqueta: "Plazo de pago por defecto (días)",
      ayuda: "Lo hereda cada proveedor nuevo si no se indica otro. Cada proveedor puede tener el suyo.",
      grupo: "Proveedores",
      ambito: "tenant",
      permiso: "finanzas:proveedores.manage",
      control: "numero",
    }),
});
