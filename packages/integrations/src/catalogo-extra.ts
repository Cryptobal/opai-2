import { z } from "zod";

import type { CategoriaIntegracion, DefinicionIntegracion } from "./catalogo";

const sinConfig = z.object({}).strict();

/** Integraciones aún sin adaptador completo y DTE (CAR-137, CAR-140). */
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
    id: "dte_emision",
    nombre: "Emisión DTE (SII)",
    categoria: "dte",
    modalidades: ["propia"] as const,
    secretos: [
      { nombre: "api_key", etiqueta: "API key SimpleAPI" },
      { nombre: "certificado_pfx", etiqueta: "Certificado digital (.pfx)" },
      { nombre: "certificado_clave", etiqueta: "Clave del certificado" },
    ],
    config: z
      .object({
        proveedor: z.enum(["simpleapi", "simulado"]).default("simulado"),
        ambiente: z.enum(["certificacion", "produccion"]).default("certificacion"),
        rutEmisor: z.string().min(3).optional(),
        certificadoMeta: z
          .object({
            titular: z.string(),
            rutTitular: z.string().nullable(),
            venceEn: z.string(),
          })
          .optional(),
      })
      .strict(),
    disponible: true,
  },
  {
    id: "dte_cesion",
    nombre: "Cesión DTE (factoring)",
    categoria: "factoring",
    modalidades: ["propia"] as const,
    secretos: [
      { nombre: "usuario", etiqueta: "Usuario Octava" },
      { nombre: "clave", etiqueta: "Clave Octava" },
    ],
    config: z.object({ proveedor: z.enum(["octava"]).default("octava") }).strict(),
    disponible: true,
  },
];
