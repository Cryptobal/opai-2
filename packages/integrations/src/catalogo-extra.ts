import { z } from "zod";

import type { CategoriaIntegracion, DefinicionIntegracion } from "./catalogo";

const sinConfig = z.object({}).strict();

/** Integraciones aún sin adaptador completo y DTE (CAR-137). */
export const INTEGRACIONES_EXTRA: readonly DefinicionIntegracion[] = [
  ...(
    [
      ["whatsapp", "WhatsApp", "whatsapp"],
      ["fintoc", "Banco (Fintoc)", "banco"],
      ["factoring", "Factoring", "factoring"],
      ["biometria", "Biometría", "biometria"],
      ["slack", "Slack", "slack"],
      ["webhooks", "Webhooks", "webhooks"],
    ] as const
  ).map(([id, nombre, categoria]) => ({
    id,
    nombre,
    categoria: categoria as CategoriaIntegracion,
    modalidades: ["propia"] as const,
    secretos: [],
    config: sinConfig,
    disponible: false,
  })),
  {
    id: "dte",
    nombre: "Facturación electrónica (DTE)",
    categoria: "dte",
    modalidades: ["propia"] as const,
    secretos: [
      { nombre: "certificado_pfx", etiqueta: "Certificado digital (.pfx)" },
      { nombre: "certificado_clave", etiqueta: "Clave del certificado" },
      { nombre: "caf_xml", etiqueta: "Archivo CAF (XML)" },
    ],
    config: z
      .object({
        ambiente: z.enum(["certificacion", "produccion"]).default("certificacion"),
        rutEmisor: z.string().min(3).optional(),
      })
      .strict(),
    disponible: true,
  },
];
