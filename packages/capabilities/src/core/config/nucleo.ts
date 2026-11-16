import { z } from "zod";

import { TAMANO_MAXIMO_DOCUMENTO } from "@opai/domain";

import { defineAjustes } from "./registro";
import { ajustesIntegracionesHabilitadas } from "./integraciones-habilitadas";
import { ajustesNavegacion } from "./navegacion";

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
    notificaciones_correo_defecto: correoOpcional.default("").meta({
      etiqueta: "Copia oculta por defecto en avisos",
      ayuda:
        "Correo en copia oculta en los avisos que envía Comunicaciones. No afecta invitaciones ni recuperación de clave. El correo comercial del perfil va en las propuestas y documentos al cliente.",
      grupo: "Comunicaciones",
      ambito: "tenant",
      permiso: "core:comunicaciones.manage",
      control: "texto",
    }),
    notificaciones_correo_comercial: correoOpcional.default("").meta({
      etiqueta: "Copia oculta · avisos comerciales",
      ayuda: "Solo eventos de Comercial y cotizaciones. Vacío: se usa la copia por defecto.",
      grupo: "Comunicaciones",
      ambito: "tenant",
      permiso: "core:comunicaciones.manage",
      control: "texto",
    }),
    notificaciones_correo_operaciones: correoOpcional.default("").meta({
      etiqueta: "Copia oculta · avisos de operaciones",
      ayuda: "Asistencia, rondas y módulos de terreno. Vacío: se usa la copia por defecto.",
      grupo: "Comunicaciones",
      ambito: "tenant",
      permiso: "core:comunicaciones.manage",
      control: "texto",
    }),
    notificaciones_correo_finanzas: correoOpcional.default("").meta({
      etiqueta: "Copia oculta · avisos de finanzas",
      ayuda: "Solo eventos del módulo Finanzas. Vacío: se usa la copia por defecto.",
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
    cumplimiento_dpa_version: z.string().max(40).default("").meta({
      etiqueta: "Versión vigente del DPA",
      ayuda:
        "Versión del acuerdo de tratamiento de datos (DPA) que los tenants aceptan (Ley 21.719). La fija y versiona OPAI. Vacío: aún no publicada.",
      grupo: "Cumplimiento",
      ambito: "plataforma",
      control: "texto",
    }),
    cumplimiento_solicitud_dias_plazo: z.number().int().min(0).max(365).default(0).meta({
      etiqueta: "Plazo de atención de solicitudes del titular (días corridos)",
      ayuda:
        "Días para responder a una persona que pide acceder, corregir o eliminar sus datos (Ley 21.719). Defínelo con asesoría legal. Con 0 todavía no hay plazo; una vez fijado, se calcula al recibir cada solicitud.",
      grupo: "Cumplimiento",
      ambito: "tenant",
      permiso: "core:cumplimiento.manage",
      control: "numero",
    }),
    cumplimiento_brecha_dias_plazo: z.number().int().min(0).max(365).default(0).meta({
      etiqueta: "Plazo para avisar una brecha (días corridos)",
      ayuda:
        "Días para avisar de una brecha de seguridad a la Agencia y a las personas afectadas (Ley 21.719). Defínelo con asesoría legal. Con 0 todavía no hay plazo.",
      grupo: "Cumplimiento",
      ambito: "tenant",
      permiso: "core:cumplimiento.manage",
      control: "numero",
    }),
    cumplimiento_dpa_texto: z.string().default("").meta({
      etiqueta: "Texto del DPA",
      ayuda:
        "Texto del acuerdo de tratamiento de datos (DPA) de esa versión. La aceptación guarda su hash (SHA-256) como prueba de a qué texto aceptó la empresa.",
      grupo: "Cumplimiento",
      ambito: "plataforma",
      control: "texto",
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
    // Brief 05 (navegación por áreas, D1/D3): preferencias de la barra lateral y de la barra
    // inferior, por usuario y empresa (cambiar de empresa cambia estas tres, §9). Sin migración
    // (ADR-038): van en `core.ajuste`, igual que `preferencias_*`.
    ...ajustesNavegacion,
    ...ajustesIntegracionesHabilitadas,
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
    // `seguridad_mfa_obligatorio_admins` se retiró (CAR-286, 11-nov-2026): el segundo factor es de
    // cada usuario. Los valores guardados quedan inertes (el catálogo ignora claves no declaradas).
    remuneraciones_imm: z.number().int().min(1).default(553_553).meta({
      etiqueta: "Ingreso mínimo mensual (CLP)",
      ayuda: "Ley 21.830: $553.553 desde el 1-may-2026. Base del tope de gratificación legal.",
      grupo: "Remuneraciones",
      ambito: "plataforma",
      control: "numero",
    }),
  }),
);
