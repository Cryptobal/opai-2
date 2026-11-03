import { z } from "zod";

import { defineCapability } from "../define";
import { ejecutarImportar10, inputImportar10 } from "./importar-1-0-handler";

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
});

const resultadoSchema = z.object({
  dryRun: z.boolean(),
  accion: z.enum(["simular", "aplicar", "conciliar", "revertir"]),
  reporte: reporteSchema.nullable(),
  conciliacion: z.unknown().nullable().optional(),
  revertir: z
    .object({
      revertidos: z.number().int(),
      bloqueados: z.array(
        z.object({ entidad: z.string(), idOpai1: z.string(), motivo: z.string() }),
      ),
    })
    .nullable()
    .optional(),
  aplicadas: z
    .object({
      cuentas: z.number().int(),
      contactos: z.number().int(),
      instalaciones: z.number().int(),
      omitidas: z.number().int(),
      importacionId: z.string().uuid().optional(),
    })
    .nullable(),
  usuariosResueltos: z.number().int(),
  usuariosSinMembresia: z.array(z.string()),
});

/** Importa cuentas, contactos, instalaciones y negocios desde OPAI 1.0 con corridas reversibles. */
export const comercialImportar10 = defineCapability({
  id: "comercial.importar_1_0",
  soloPersonas: true,
  descripcion:
    "Importa un export de OPAI 1.0 (simular, aplicar, conciliar o revertir). Idempotente por ids externos; solo owner o admin.",
  permiso: "comercial:config.manage",
  input: inputImportar10,
  output: resultadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun, idempotencyKey }) {
    const r = await ejecutarImportar10(ctx, input, dryRun, idempotencyKey);
    const reporte = r.reporte
      ? { ...r.reporte, modulosActivos: [...r.reporte.modulosActivos] }
      : null;
    return {
      dryRun: r.dryRun,
      accion: r.accion,
      reporte,
      conciliacion: "conciliacion" in r ? (r.conciliacion ?? null) : null,
      revertir: "revertir" in r ? (r.revertir ?? null) : null,
      aplicadas: r.aplicadas ?? null,
      usuariosResueltos: r.usuariosResueltos ?? 0,
      usuariosSinMembresia: r.usuariosSinMembresia ?? [],
    };
  },
});
