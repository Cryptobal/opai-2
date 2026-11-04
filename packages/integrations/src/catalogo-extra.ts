import { z } from "zod";

import type { CategoriaIntegracion, DefinicionIntegracion } from "./catalogo";

const sinConfig = z.object({}).strict();

/** Integraciones aún sin adaptador completo y DTE (CAR-137, CAR-140). */
export const INTEGRACIONES_EXTRA: readonly DefinicionIntegracion[] = [
  ...(
    [
      ["whatsapp", "WhatsApp", "whatsapp"],
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
    // Movimientos del banco en línea: Web4Leads (que se conecta a Fintoc) empuja un webhook firmado por
    // empresa a `/api/t/<slug>/banco/web4leads`. OPAI no guarda credenciales del banco (CAR-bancos).
    id: "web4leads",
    nombre: "Banco (Web4Leads)",
    categoria: "banco",
    modalidades: ["propia"] as const,
    secretos: [{ nombre: "api_key", etiqueta: "Secreto de firma del webhook de Web4Leads" }],
    config: sinConfig,
    disponible: true,
  },
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
    // Consulta de contribuyente por RUT (CAR-162): producto SimpleAPI RUT, distinto de la emisión.
    id: "sii_contribuyente",
    nombre: "Datos del SII por RUT",
    categoria: "dte",
    modalidades: ["propia"] as const,
    secretos: [{ nombre: "api_key", etiqueta: "API key SimpleAPI RUT" }],
    config: sinConfig,
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
    config: z
      .object({
        proveedor: z.enum(["octava"]).default("octava"),
        /** Datos del cedente que Octava exige en CedeDte (CAR-154); sin ellos se usa el usuario que cede. */
        emailCedente: z.string().trim().email().max(40).optional(),
        direccionCedente: z.string().trim().min(3).max(70).optional(),
        contactoNombre: z.string().trim().min(2).max(40).optional(),
        contactoEmail: z.string().trim().email().max(40).optional(),
      })
      .strict(),
    disponible: true,
  },
];
