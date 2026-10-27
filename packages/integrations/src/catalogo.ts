// Catálogo de integraciones del núcleo (ADR-027). Cada integración declara categoría, modalidades,
// secretos que admite en modalidad propia y si ya tiene adaptador. Las credenciales de plataforma
// solo se leen aquí, nunca en módulos.
import { z } from "zod";

export type CategoriaIntegracion =
  | "correo"
  | "geo"
  | "ia"
  | "whatsapp"
  | "dte"
  | "banco"
  | "factoring"
  | "biometria"
  | "slack"
  | "webhooks";

export type DefinicionIntegracion = {
  id: string;
  nombre: string;
  categoria: CategoriaIntegracion;
  modalidades: readonly ("plataforma" | "propia")[];
  /** Secretos de la modalidad propia (se guardan cifrados). */
  secretos: readonly { nombre: string; etiqueta: string }[];
  /** Configuración no secreta validada al guardar. */
  config: z.ZodType;
  /** false = aparece como "Próximamente". */
  disponible: boolean;
  /** Variable de entorno con la credencial de plataforma (solo servidor). */
  envPlataforma?: string;
};

const sinConfig = z.object({}).strict();

export const CATALOGO_INTEGRACIONES: readonly DefinicionIntegracion[] = [
  {
    id: "resend",
    nombre: "Correo",
    categoria: "correo",
    modalidades: ["plataforma", "propia"],
    secretos: [{ nombre: "api_key", etiqueta: "API key de Resend" }],
    config: z
      .object({ remitente: z.string().min(3).optional(), responderA: z.email().optional() })
      .strict(),
    disponible: true,
    envPlataforma: "RESEND_API_KEY",
  },
  {
    id: "google_maps",
    nombre: "Geolocalización",
    categoria: "geo",
    modalidades: ["plataforma", "propia"],
    secretos: [{ nombre: "api_key", etiqueta: "API key de Google Maps" }],
    config: sinConfig,
    disponible: true,
    envPlataforma: "GOOGLE_MAPS_SERVER_KEY",
  },
  ...(["ia_anthropic", "ia_openai", "ia_google"] as const).map((id) => ({
    id,
    nombre: { ia_anthropic: "IA · Anthropic", ia_openai: "IA · OpenAI", ia_google: "IA · Google" }[
      id
    ],
    categoria: "ia" as const,
    modalidades: (id === "ia_anthropic" ? ["plataforma", "propia"] : ["propia"]) as readonly (
      "plataforma" | "propia"
    )[],
    secretos: [{ nombre: "api_key", etiqueta: "API key" }],
    config: z
      .object({
        modelos: z
          .object({ economica: z.string(), estandar: z.string(), potente: z.string() })
          .partial()
          .optional(),
      })
      .strict(),
    disponible: true,
    envPlataforma: {
      ia_anthropic: "ANTHROPIC_API_KEY",
      ia_openai: "OPENAI_API_KEY",
      ia_google: "GEMINI_API_KEY",
    }[id],
  })),
  // Proveedores "compatibles con OpenAI" (ADR-049): solo BYOK del tenant. `ia_xai` trae su base URL
  // pública por defecto; `ia_compatible` la pide en la config (cubre Vercel AI Gateway, OpenRouter…).
  {
    id: "ia_xai",
    nombre: "IA · xAI (Grok)",
    categoria: "ia",
    modalidades: ["propia"],
    secretos: [{ nombre: "api_key", etiqueta: "API key de xAI" }],
    config: z
      .object({
        modelos: z
          .object({ economica: z.string(), estandar: z.string(), potente: z.string() })
          .partial()
          .optional(),
      })
      .strict(),
    disponible: true,
  },
  {
    id: "ia_compatible",
    nombre: "IA · Compatible con OpenAI",
    categoria: "ia",
    modalidades: ["propia"],
    secretos: [{ nombre: "api_key", etiqueta: "API key del proveedor" }],
    config: z
      .object({
        baseUrl: z.url(),
        modelos: z
          .object({ economica: z.string(), estandar: z.string(), potente: z.string() })
          .partial()
          .optional(),
      })
      .strict(),
    disponible: true,
  },
  ...(
    [
      ["whatsapp", "WhatsApp", "whatsapp"],
      ["dte", "Facturación electrónica (DTE)", "dte"],
      ["fintoc", "Banco (Fintoc)", "banco"],
      ["factoring", "Factoring", "factoring"],
      ["biometria", "Biometría", "biometria"],
      ["slack", "Slack", "slack"],
      ["webhooks", "Webhooks", "webhooks"],
    ] as const
  ).map(([id, nombre, categoria]) => ({
    id,
    nombre,
    categoria,
    modalidades: ["propia"] as const,
    secretos: [],
    config: sinConfig,
    disponible: false,
  })),
];

export const definicionIntegracion = (id: string) =>
  CATALOGO_INTEGRACIONES.find((i) => i.id === id);

/** Credencial de plataforma de una integración (solo servidor). null si no existe en este entorno. */
export function credencialDePlataforma(
  id: string,
  env: Record<string, string | undefined> = process.env,
) {
  const variable = definicionIntegracion(id)?.envPlataforma;
  return variable ? env[variable]?.trim() || null : null;
}
