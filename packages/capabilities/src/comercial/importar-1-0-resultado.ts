import { z } from "zod";

import { resumenSiiSchema } from "./importar-1-0-sii";

const reporteSchema = z.object({
  modo: z.literal("simulacion"),
  sistema: z.literal("opai1"),
  tenant: z.string(),
  modulosActivos: z.array(z.string()),
  tributario: z.object({
    cuentasConsideradas: z.number().int(),
    listasParaFacturar: z.number().int(),
    incompletas: z.number().int(),
    faltantesPorCampo: z.record(z.string(), z.number().int()),
  }),
  destinatarios: z
    .object({
      entrantes: z.number().int(),
      asignados: z.number().int(),
      omitidos: z.number().int(),
      omitidosPorMotivo: z.record(z.string(), z.number().int()),
    })
    .optional(),
  correlativosCpq: z.array(z.unknown()).optional(),
  pendientes: z.array(
    z.object({ entidad: z.string(), filas: z.number().int(), motivo: z.string() }),
  ),
  avisos: z.array(z.object({ codigo: z.string(), idsOpai1: z.array(z.string()) })),
  etapasSinMapear: z.array(z.string()),
  negociosIncompletos: z.array(z.string()),
  importacionId: z.string().nullable(),
  conteos: z.record(z.string(), z.record(z.string(), z.number().int())),
  detalle: z.array(z.unknown()).optional(),
  propuestasFusion: z.array(z.unknown()).optional(),
  etiquetas: z.array(z.unknown()).optional(),
  omitidas: z.array(z.unknown()).optional(),
});

export const resultadoImportar10Schema = z.object({
  dryRun: z.boolean(),
  accion: z.enum(["simular", "aplicar", "conciliar", "revertir"]),
  reporte: reporteSchema.nullable(),
  conciliacion: z.unknown().nullable().optional(),
  revertir: z
    .object({
      revertidos: z.number().int(),
      bloqueados: z.array(
        z.object({ entidad: z.string(), id10: z.string(), motivo: z.string() }),
      ),
    })
    .nullable()
    .optional(),
  aplicadas: z
    .object({
      cuentas: z.number().int(),
      contactos: z.number().int(),
      instalaciones: z.number().int(),
      programaciones: z.number().int().optional(),
      negocios: z.number().int().optional(),
      cotizaciones: z.number().int().optional(),
      correlativosCpq: z.number().int().optional(),
      omitidas: z.number().int(),
      importacionId: z.string().uuid().optional(),
    })
    .nullable(),
  usuariosResueltos: z.number().int(),
  usuariosSinMembresia: z.array(z.string()),
  /** Consulta al SII en lote (CAR-156): caché al simular, consultas encoladas al aplicar. */
  sii: resumenSiiSchema.nullable().optional(),
});

