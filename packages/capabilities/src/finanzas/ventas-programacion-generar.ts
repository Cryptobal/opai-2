// Generar los borradores de una programación (BRIEF-26 · CAR-159).
import { z } from "zod";

import {
  fechasGeneracion,
  periodoProgramacion,
  periodosProgramacion,
  permitidoPorCorte,
  sumarDiasIso,
} from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { hoy } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { PERMISO_VENTAS } from "./ventas-comun";
import {
  agendaDe,
  corteDe,
  desdeRecuperacion,
  periodosHechos,
  proximaEjecucionDe,
} from "./ventas-programacion-agenda";
import { generarPeriodo, type ResultadoPeriodo } from "./ventas-programacion-generar-nucleo";

export const resultadoPeriodoSchema = z.object({
  periodo: z.string(),
  fecha: z.string(),
  estado: z.enum(["generado", "omitido", "ya_generado"]),
  motivo: z.string().nullable(),
  documentoId: z.string().nullable(),
  montoTotal: z.number().int().nullable(),
  ufCentavos: z.number().int().nullable(),
});

export async function cargarGenerable(ctx: Contexto, id: string) {
  const p = await ctx.db.ventasProgramacion.findFirst({
    where: { id },
    include: { lineas: { orderBy: { orden: "asc" } } },
  });
  if (!p) throw noEncontrado("La programación");
  return p;
}

/** Períodos a generar: el pedido (aunque sea antiguo) o los pendientes de la ventana de recuperación. */
export async function periodosAGenerar(
  ctx: Contexto,
  p: Awaited<ReturnType<typeof cargarGenerable>>,
  periodo?: string,
) {
  const agenda = agendaDe(p);
  const corte = await corteDe(ctx.db, ctx.tenantId, p);
  const h = hoy();
  if (!periodo) {
    const hechos = await periodosHechos(ctx.db, p.id);
    return periodosProgramacion(agenda, corte, {
      desde: desdeRecuperacion(h),
      hasta: h,
      hechos,
      limite: 12,
    });
  }
  const fecha = fechasGeneracion(agenda, agenda.fechaInicio, sumarDiasIso(h, 400)).find(
    (f) => periodoProgramacion(agenda.frecuencia, f) === periodo,
  );
  if (!fecha)
    throw reglaDeNegocio(`El período ${periodo} no está en la agenda de la programación.`);
  if (!permitidoPorCorte(fecha, corte))
    throw reglaDeNegocio(`El período ${periodo} ya se facturó en OPAI 1.0 (fecha de corte).`);
  return [{ periodo, fecha }];
}

export async function generarProgramacion(
  ctx: Contexto,
  id: string,
  dryRun: boolean,
  periodo?: string,
) {
  const p = await cargarGenerable(ctx, id);
  if (!p.activa) throw reglaDeNegocio("La programación está pausada; actívala para generar.");
  const resultados: ResultadoPeriodo[] = [];
  for (const per of await periodosAGenerar(ctx, p, periodo)) {
    resultados.push(await generarPeriodo(ctx, p, per.periodo, per.fecha, dryRun));
  }
  if (!dryRun) {
    const proxima = await proximaEjecucionDe(ctx.db, ctx.tenantId, p);
    await ctx.db.ventasProgramacion.update({
      where: { id: p.id },
      data: {
        proximaEjecucionEn: proxima,
        ...(resultados.some((r) => r.estado === "generado")
          ? { ultimaEjecucionEn: new Date() }
          : {}),
      },
    });
  }
  return resultados;
}

export const ventasProgramacionGenerar = defineCapability({
  id: "finanzas.ventas_programacion.generar",
  descripcion:
    "Genera los borradores de factura de una programación recurrente: un período puntual o lo pendiente del último mes. Cada período se genera una sola vez y nunca se emite al SII sin revisión.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    programacionId: uuidSchema,
    periodo: z
      .string()
      .regex(/^\d{4}-\d{2}(-\d{2})?$/)
      .optional()
      .describe(
        "«aaaa-mm» (mensual o anual) o «aaaa-mm-dd» (semanal o quincenal). Sin él, lo pendiente.",
      ),
  }),
  output: z.object({ resultados: z.array(resultadoPeriodoSchema) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    return {
      resultados: await generarProgramacion(ctx, input.programacionId, dryRun, input.periodo),
    };
  },
});
