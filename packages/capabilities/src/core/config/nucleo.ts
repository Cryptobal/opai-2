import { z } from "zod";

import { TAMANO_MAXIMO_DOCUMENTO } from "@opai/domain";

import { defineAjustes } from "./registro";

const correoOpcional = z.union([z.literal(""), z.email()]);
const modelo = z.object({ proveedor: z.string(), modelo: z.string() });

/** Ajustes propios del núcleo (Brief 02, bloque 8). Las claves usan "_" para agrupar por tema. */
export const AJUSTES_NUCLEO = defineAjustes(
  "core",
  z.object({
    comunicaciones_remitente: z.string().max(80).default("").meta({
      etiqueta: "Nombre del remitente",
      ayuda: "Cómo aparece la empresa en los correos. Vacío: el nombre de la empresa.",
      grupo: "Comunicaciones",
      ambito: "tenant",
      permiso: "core:comunicaciones.manage",
      control: "texto",
    }),
    comunicaciones_cco_comercial: correoOpcional.default("").meta({
      etiqueta: "Copia oculta · comercial",
      grupo: "Comunicaciones",
      ambito: "tenant",
      permiso: "core:comunicaciones.manage",
      control: "texto",
    }),
    comunicaciones_cco_operaciones: correoOpcional.default("").meta({
      etiqueta: "Copia oculta · operaciones",
      grupo: "Comunicaciones",
      ambito: "tenant",
      permiso: "core:comunicaciones.manage",
      control: "texto",
    }),
    comunicaciones_cco_finanzas: correoOpcional.default("").meta({
      etiqueta: "Copia oculta · finanzas",
      grupo: "Comunicaciones",
      ambito: "tenant",
      permiso: "core:comunicaciones.manage",
      control: "texto",
    }),
    documentos_tamano_maximo_mb: z
      .number()
      .int()
      .min(1)
      .max(TAMANO_MAXIMO_DOCUMENTO / 1_048_576)
      .default(25)
      .meta({
        etiqueta: "Tamaño máximo por archivo (MB)",
        grupo: "Documentos",
        ambito: "tenant",
        permiso: "core:documentos.manage",
        control: "numero",
      }),
    preferencias_tema: z
      .enum(["sistema", "claro", "oscuro"])
      .default("sistema")
      .meta({ etiqueta: "Tema", grupo: "Preferencias", ambito: "usuario", control: "seleccion" }),
    preferencias_silencio: z.boolean().default(false).meta({
      etiqueta: "Silenciar avisos por correo",
      ayuda: "Los correos transaccionales (invitaciones, recuperación) llegan igual.",
      grupo: "Preferencias",
      ambito: "usuario",
      control: "switch",
    }),
    preferencias_resumen: z.enum(["nunca", "diario"]).default("nunca").meta({
      etiqueta: "Resumen de avisos",
      grupo: "Preferencias",
      ambito: "usuario",
      control: "seleccion",
    }),
    ia_modelos: z
      .object({ economica: modelo, estandar: modelo, potente: modelo })
      .default({
        economica: { proveedor: "ia_anthropic", modelo: "claude-haiku-5-5" },
        estandar: { proveedor: "ia_anthropic", modelo: "claude-sonnet-5-5" },
        potente: { proveedor: "ia_anthropic", modelo: "claude-opus-5-5" },
      })
      .meta({
        etiqueta: "Modelos de IA por clase de tarea",
        grupo: "Inteligencia artificial",
        ambito: "plataforma",
        control: "json",
      }),
    seguridad_mfa_obligatorio_admins: z.boolean().default(true).meta({
      etiqueta: "Exigir segundo factor a dueños y administradores",
      ayuda: "Owner y admin deben activar el segundo factor para entrar. Las cuentas de plataforma lo exigen siempre. Decisión de Carlos (26-oct-2026): por defecto obligatorio.",
      grupo: "Seguridad",
      ambito: "tenant",
      control: "switch",
    }),
    remuneraciones_imm: z.number().int().min(1).default(553_553).meta({
      etiqueta: "Ingreso mínimo mensual (CLP)",
      ayuda: "Ley 21.830: $553.553 desde el 1-may-2026. Base del tope de gratificación legal.",
      grupo: "Remuneraciones",
      ambito: "plataforma",
      control: "numero",
    }),
  }),
);
