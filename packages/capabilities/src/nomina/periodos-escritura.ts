import { z } from "zod";

import {
  OBLIGACIONES_MENSUALES,
  esRetrocesoPeriodo,
  etiquetaPeriodo,
  transicionPeriodoValida,
} from "@opai/domain";

import { defineCapability } from "../define";
import { conflicto, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_PAGAR, PERMISO_PERIODOS, fechasPeriodo, periodoDe, periodoSchema } from "./comun";
import { aplicarCuotasDelPeriodo } from "./prestamos-util";
import { vistaPeriodo } from "./vistas";

const EVENTO_ESTADO = {
  abierto: "nomina.periodo.reabierto",
  en_revision: "nomina.periodo.en_revision",
  cerrado: "nomina.periodo.cerrado",
  pagado: "nomina.periodo.pagado",
} as const;

/** Abre el período de un mes y deja listas sus obligaciones mensuales del calendario. */
export const periodosAbrir = defineCapability({
  id: "nomina.periodos.abrir",
  descripcion:
    "Abre el período de remuneraciones de un mes (año y mes) con su cierre previsto según el día de cierre configurado, y deja creadas sus obligaciones mensuales del calendario (LRE, Previred y retención F29). Un mes tiene un solo período.",
  permiso: PERMISO_PERIODOS,
  input: z.object({ anio: z.number().int().min(2000).max(2100), mes: z.number().int().min(1).max(12) }),
  output: periodoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { anio, mes }, { dryRun }) {
    const existente = await ctx.db.nominaPeriodo.findFirst({ where: { anio, mes } });
    if (existente) throw conflicto(`${etiquetaPeriodo(anio, mes)} ya tiene un período.`);
    const fechas = await fechasPeriodo(ctx, anio, mes);
    if (dryRun) {
      return vistaPeriodo(
        { id: "", anio, mes, estado: "abierto", ...fechas, cerradoEn: null, pagadoEn: null, motivoReapertura: null },
        0,
      );
    }
    return ctx.transaccion(async (tx) => {
      const creado = await tx.nominaPeriodo.create({
        data: { tenantId: ctx.tenantId, anio, mes, estado: "abierto", ...fechas },
      });
      for (const tipo of OBLIGACIONES_MENSUALES) {
        const hay = await tx.nominaObligacion.findFirst({ where: { tipo, anio, mes } });
        if (hay) await tx.nominaObligacion.update({ where: { id: hay.id }, data: { periodoId: creado.id } });
        else await tx.nominaObligacion.create({ data: { tenantId: ctx.tenantId, periodoId: creado.id, estado: "por_generar", tipo, anio, mes } });
      }
      await ctx.eventos.emitir(tx, {
        tipo: "nomina.periodo.abierto",
        entidadTipo: "periodo",
        entidadId: creado.id,
        payload: { anio, mes },
      });
      return vistaPeriodo(creado, 0);
    });
  },
});

/** Pasa el período a «en revisión» o «cerrado», o lo devuelve a una etapa anterior con motivo. */
export const periodosCambiarEstado = defineCapability({
  id: "nomina.periodos.cambiar_estado",
  descripcion:
    "Cambia el estado de un período de remuneraciones: avanza de abierto a en revisión y de en revisión a cerrado, o lo devuelve a una etapa anterior con un motivo (reabrir). Al cerrar, las cuotas de préstamo del mes quedan descontadas. Para marcarlo pagado usa nomina.periodos.marcar_pagado.",
  permiso: PERMISO_PERIODOS,
  input: z.object({
    id: uuidSchema,
    a: z.enum(["abierto", "en_revision", "cerrado"]),
    motivo: z.string().trim().min(5).max(300).optional().describe("Obligatorio al devolver a una etapa anterior."),
  }),
  output: periodoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, a, motivo }, { dryRun }) {
    const p = await periodoDe(ctx, id);
    const de = p.estado as Parameters<typeof transicionPeriodoValida>[0];
    if (!transicionPeriodoValida(de, a))
      throw reglaDeNegocio(`Un período ${de.replace("_", " ")} no puede pasar a ${a.replace("_", " ")}.`);
    const retroceso = esRetrocesoPeriodo(de, a);
    if (retroceso && !motivo) throw reglaDeNegocio("Devolver el período a una etapa anterior exige un motivo.");
    const ahora = new Date();
    const datos = {
      estado: a,
      ...(a === "en_revision" && !retroceso ? { enRevisionEn: ahora } : {}),
      ...(a === "cerrado" ? { cerradoEn: ahora, cerradoPor: ctx.usuario?.id ?? null } : {}),
      ...(de === "cerrado" ? { cerradoEn: null, cerradoPor: null } : {}),
      motivoReapertura: retroceso ? (motivo ?? null) : p.motivoReapertura,
    };
    const cuenta = await ctx.db.nominaNovedad.count({ where: { periodoId: id, estado: "vigente" } });
    if (dryRun) return vistaPeriodo({ ...p, ...datos }, cuenta);
    return ctx.transaccion(async (tx) => {
      const r = await tx.nominaPeriodo.updateMany({ where: { id, estado: de }, data: datos });
      if (r.count === 0) throw conflicto("El período cambió de estado mientras lo editabas; vuelve a intentar.");
      if (a === "cerrado") await aplicarCuotasDelPeriodo(tx, id, true);
      if (de === "cerrado") await aplicarCuotasDelPeriodo(tx, id, false);
      await ctx.eventos.emitir(tx, {
        tipo: retroceso ? EVENTO_ESTADO.abierto : EVENTO_ESTADO[a],
        entidadTipo: "periodo",
        entidadId: id,
        payload: { de, a, ...(retroceso ? { motivo } : {}) },
      });
      const nuevo = (await tx.nominaPeriodo.findUnique({ where: { id } })) ?? p;
      return vistaPeriodo(nuevo, cuenta);
    });
  },
});

/** Marca el período como pagado: acto final que no se deshace. */
export const periodosMarcarPagado = defineCapability({
  id: "nomina.periodos.marcar_pagado",
  descripcion:
    "Marca como pagado un período de remuneraciones ya cerrado. Es el acto final del mes y no se deshace: desde ahí el período no admite cambios. Un agente necesita aprobación humana.",
  permiso: PERMISO_PAGAR,
  input: z.object({ id: uuidSchema }),
  output: periodoSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    const p = await periodoDe(ctx, id);
    if (p.estado !== "cerrado") throw reglaDeNegocio("Solo se marca como pagado un período cerrado.");
    const cuenta = await ctx.db.nominaNovedad.count({ where: { periodoId: id, estado: "vigente" } });
    const ahora = new Date();
    if (dryRun) return vistaPeriodo({ ...p, estado: "pagado", pagadoEn: ahora }, cuenta);
    return ctx.transaccion(async (tx) => {
      const r = await tx.nominaPeriodo.updateMany({
        where: { id, estado: "cerrado" },
        data: { estado: "pagado", pagadoEn: ahora },
      });
      if (r.count === 0) throw conflicto("El período cambió de estado; vuelve a intentar.");
      await ctx.eventos.emitir(tx, {
        tipo: EVENTO_ESTADO.pagado,
        entidadTipo: "periodo",
        entidadId: id,
        payload: { anio: p.anio, mes: p.mes },
      });
      const nuevo = (await tx.nominaPeriodo.findUnique({ where: { id } })) ?? p;
      return vistaPeriodo(nuevo, cuenta);
    });
  },
});
