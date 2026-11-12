import { z } from "zod";

import type { CategoriaIntegracion, DefinicionIntegracion } from "./catalogo";
import { slackConfigSchema } from "./slack/config";

const sinConfig = z.object({}).strict();

/** Integraciones aún sin adaptador completo y DTE (CAR-137, CAR-140). */
export const INTEGRACIONES_EXTRA: readonly DefinicionIntegracion[] = [
  ...(
    [
      ["whatsapp", "WhatsApp", "whatsapp"],
      ["factoring", "Factoring", "factoring"],
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
    // Biometría facial (CAR-89 · B4, D-05): AWS Rekognition con una colección por empresa. Región y
    // credenciales viven en el almacén cifrado del tenant; "simulado" es el proveedor de pruebas y CI.
    id: "biometria",
    nombre: "Biometría facial (AWS Rekognition)",
    categoria: "biometria",
    modalidades: ["propia"] as const,
    secretos: [
      { nombre: "access_key_id", etiqueta: "Access key ID de AWS" },
      { nombre: "secret_access_key", etiqueta: "Secret access key de AWS" },
      { nombre: "region", etiqueta: "Región de AWS (por ejemplo sa-east-1)" },
    ],
    config: z
      .object({ proveedor: z.enum(["rekognition", "simulado"]).default("simulado") })
      .strict(),
    disponible: true,
  },
  {
    // Slack (ADR-093, CAR-291): una sola app «OPAI» de plataforma que cada empresa instala con OAuth
    // desde su propia pantalla. El token del bot se guarda cifrado y no es un secreto que se escriba a
    // mano: por eso `secretos` va vacío. `envPlataforma` indica si la app está registrada en el entorno.
    id: "slack",
    nombre: "Slack",
    categoria: "slack",
    modalidades: ["plataforma"] as const,
    secretos: [],
    config: slackConfigSchema,
    disponible: true,
    envPlataforma: "SLACK_CLIENT_ID",
  },
  {
    // Traer los datos de la empresa desde OPAI 1 (CAR-279): el exportador de 1.0 (`/api/export/opai2/v1`)
    // pide una llave de solo lectura que crea el dueño en OPAI 1 y pega aquí. Nunca va en variables de entorno.
    id: "opai1",
    nombre: "OPAI 1 (traer datos)",
    categoria: "migracion",
    modalidades: ["propia"] as const,
    secretos: [
      { nombre: "api_key", etiqueta: "Llave de solo lectura de OPAI 1" },
      { nombre: "url", etiqueta: "Dirección del exportador (https://…/api/export/opai2/v1)" },
    ],
    config: sinConfig,
    disponible: true,
    // Solo para migrar desde OPAI 1: la ven únicamente las empresas habilitadas por Plataforma (CAR-321).
    soloHabilitadas: true,
  },
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
      { nombre: "usuario", etiqueta: "RUT de acceso a la API de Octava" },
      { nombre: "clave", etiqueta: "Contraseña de acceso a la API de Octava" },
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
