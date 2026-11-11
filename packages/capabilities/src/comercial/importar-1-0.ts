import { z } from "zod";

import { defineCapability } from "../define";
import { executeCapability } from "../execute";
import { ErrorCapacidad } from "../errores";
import type { Contexto } from "../types";
import type { DatosOpai1, Plan } from "@opai/db/importar-opai1";
import { ejecutarImportar10, inputImportar10, pideOpai1 } from "./importar-1-0-handler";
import { leerExportDeOpai1 } from "./importar-1-0-origen";
import { exigirOwnerAdmin } from "./importar-1-0-usuarios";
import { resumenSiiDelPlan, resumenSiiSchema } from "./importar-1-0-sii";

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

const resultadoSchema = z.object({
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

async function fijarCorrelativosCpqDesdePlan(ctx: Contexto, plan: Plan, dryRun: boolean): Promise<number> {
  let n = 0;
  for (const c of plan.correlativosCpq) {
    if (c.omitido) continue;
    const r = await executeCapability(
      ctx,
      "cpq.correlativos.fijar",
      { anio: c.anio, ultimo: c.fijariaUltimo },
      { dryRun },
    );
    if (!r.ok) throw new ErrorCapacidad(r.error.code, r.error.message);
    n += 1;
  }
  return n;
}

/** Importa cuentas, contactos, instalaciones y negocios desde OPAI 1.0 con corridas reversibles. */
export const comercialImportar10 = defineCapability({
  id: "comercial.importar_1_0",
  soloPersonas: true,
  descripcion:
    "Importa un export de OPAI 1.0 (simular, aplicar, conciliar o revertir). Idempotente por ids externos; solo owner o admin. Informa en `sii` cuántas cuentas el SII podría completar (simular lee la caché; aplicar encola las consultas) sin escribir datos del SII en las cuentas.",
  permiso: "comercial:config.manage",
  input: inputImportar10,
  output: resultadoSchema,
  efecto: "escritura",
  dryRun: true,
  // La lectura de OPAI 1 (red, varios segundos) va antes de la transacción de la escritura.
  async preparar(ctx, input) {
    if (!pideOpai1(input)) return undefined;
    await exigirOwnerAdmin(ctx);
    return leerExportDeOpai1(ctx);
  },
  async handler(ctx, input, { dryRun, idempotencyKey, preparado }) {
    const traido = (preparado as DatosOpai1 | undefined) ?? (pideOpai1(input) ? await leerExportDeOpai1(ctx) : undefined);
    const r = await ejecutarImportar10(ctx, input, dryRun, idempotencyKey, traido);
    const plan = "plan" in r ? (r.plan as Plan | undefined) : undefined;
    let correlativosCpq = 0;
    if (plan && (r.accion === "simular" || r.accion === "conciliar" || (r.accion === "aplicar" && !dryRun))) {
      correlativosCpq = await fijarCorrelativosCpqDesdePlan(ctx, plan, dryRun || r.accion !== "aplicar");
    }
    const sii =
      plan && (r.accion === "simular" || r.accion === "aplicar")
        ? // Decisión de Carlos (11-nov-2026): importar no consulta el SII por su cuenta. Solo se informa
          // cuántas cuentas podría completar; la consulta se pide a mano en cada cuenta.
          await resumenSiiDelPlan(ctx, plan, { encolar: false })
        : null;
    const reporte = r.reporte
      ? { ...r.reporte, modulosActivos: [...r.reporte.modulosActivos] }
      : null;
    const aplicadas =
      r.aplicadas && r.accion === "aplicar"
        ? { ...r.aplicadas, correlativosCpq }
        : r.aplicadas;
    return {
      dryRun: r.dryRun,
      accion: r.accion,
      reporte,
      conciliacion: "conciliacion" in r ? (r.conciliacion ?? null) : null,
      revertir: "revertir" in r ? (r.revertir ?? null) : null,
      aplicadas: aplicadas ?? null,
      usuariosResueltos: r.usuariosResueltos ?? 0,
      usuariosSinMembresia: r.usuariosSinMembresia ?? [],
      sii,
    };
  },
});
