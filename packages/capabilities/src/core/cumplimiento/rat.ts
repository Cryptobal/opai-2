import { z } from "zod";

import {
  CATEGORIAS_RAT,
  conteosPorCategoria,
  construirRatPorActividad,
  PERMISOS_CORE,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { listarInventario } from "./inventario";

const categoriaRat = z.enum(CATEGORIAS_RAT);

const actividadSchema = z.object({
  id: z.number(),
  actividad: z.string(),
  datos: z.array(z.string()),
  categoria: categoriaRat,
  categorias: z.array(categoriaRat),
  base: z.string(),
  baseLicitud: z.string(),
  retencion: z.string().nullable(),
  retencionPendiente: z.boolean(),
  destinatarios: z.array(z.string()),
  tablas: z.array(z.string()),
});

const tablaSchema = z.object({
  modulo: z.string(),
  tabla: z.string(),
  finalidad: z.string(),
  categorias: z.array(z.string()),
  campos: z.array(z.string()),
  camposSensibles: z.array(z.string()),
  baseLicitud: z.string(),
  reguladoNoBorrable: z.boolean(),
  destinatarios: z.array(z.string()),
  retencion: z.string().nullable(),
});

export const cumplimientoRat = defineCapability({
  id: "core.cumplimiento.rat",
  descripcion:
    "Registro de actividades de tratamiento (RAT, Ley 21.719) en lenguaje de negocio: una fila por actividad (personal, sueldos, contactos, ingresos, documentos…) con sus datos legibles, categoría, base de licitud (propuesta), retención y destinatarios. Mantiene el inventario técnico por tabla.",
  permiso: PERMISOS_CORE.cumplimientoRead,
  input: z.object({
    categoria: categoriaRat
      .optional()
      .describe("Filtra las actividades que contienen esta categoría (para los FilterChip)."),
    modulo: z
      .string()
      .trim()
      .optional()
      .describe('Filtra solo la salida `porTabla` por módulo, p. ej. "core" (las actividades son del Núcleo).'),
  }),
  output: z.object({
    /** Las bases de licitud son propuestas: las confirma asesoría legal (§16.2). */
    basesPropuestas: z.boolean(),
    actividades: z.array(actividadSchema),
    conteos: z.array(z.object({ categoria: categoriaRat, total: z.number() })),
    /** Inventario técnico por tabla (compatibilidad: el detalle no se pierde). */
    porTabla: z.array(tablaSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(_ctx, input) {
    const inventario = listarInventario();
    const todas = construirRatPorActividad(inventario);
    const actividades = input.categoria
      ? todas.filter((a) => a.categorias.includes(input.categoria!))
      : todas;
    const porTabla = inventario
      .filter((d) => !input.modulo || d.modulo === input.modulo)
      .map((d) => ({
        modulo: d.modulo,
        tabla: d.tabla,
        finalidad: d.finalidad,
        categorias: [...d.categorias],
        campos: [...d.campos],
        camposSensibles: [...(d.camposSensibles ?? [])],
        baseLicitud: d.baseLicitud,
        reguladoNoBorrable: d.reguladoNoBorrable ?? false,
        destinatarios: [...(d.destinatarios ?? [])],
        retencion: d.retencion ?? null,
      }));
    // Los conteos salen del conjunto completo (sin el filtro), para que los chips no cambien al filtrar.
    return { basesPropuestas: true, actividades, conteos: conteosPorCategoria(todas), porTabla };
  },
});
