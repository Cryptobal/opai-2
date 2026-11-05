import { z } from "zod";

import { PERMISO_CONFIG } from "./permisos";

/** Ajustes del módulo Rendiciones (ADR-018): los lee `ajuste()` y los cambia `core.config.set`. */
export const ajustesRendiciones = z.object({
  exigir_respaldo: z.boolean().default(true).meta({
    etiqueta: "Exigir boleta o factura en cada gasto",
    ayuda: "Si se apaga, un gasto sin respaldo se acepta; si está encendido, solo con un motivo escrito.",
    grupo: "Respaldo",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "switch",
  }),
  aprobador_defecto_id: z.string().default("").meta({
    etiqueta: "Aprobador por defecto",
    ayuda: "Usuario que aprueba cuando quien rinde no elige uno. Vacío = quien rinde debe elegirlo.",
    grupo: "Aprobación",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "texto",
  }),
});
