// Crear, editar, activar y pausar programaciones recurrentes (BRIEF-26 · CAR-159).
import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { PERMISO_VENTAS } from "./ventas-comun";
import { proximaEjecucionDe } from "./ventas-programacion-agenda";
import {
  datosProgramacion,
  escribirDetalle,
  validarProgramacion,
} from "./ventas-programacion-datos";
import { programacionBaseSchema } from "./ventas-programacion-esquemas";
import { motivoNoActivable } from "@opai/domain";

const resultadoSchema = z.object({
  id: z.string(),
  activa: z.boolean(),
  proximaEjecucionEn: z.string().nullable(),
});

async function cargar(ctx: Contexto, id: string) {
  const p = await ctx.db.ventasProgramacion.findFirst({ where: { id }, include: { lineas: true } });
  if (!p) throw noEncontrado("La programación");
  return p;
}

async function recalcularProxima(ctx: Contexto, id: string) {
  const p = await cargar(ctx, id);
  const proxima = p.activa ? await proximaEjecucionDe(ctx.db, ctx.tenantId, p) : null;
  await ctx.db.ventasProgramacion.update({ where: { id }, data: { proximaEjecucionEn: proxima } });
  return {
    id,
    activa: p.activa,
    proximaEjecucionEn: proxima ? proxima.toISOString().slice(0, 10) : null,
  };
}

export const ventasProgramacionCrear = defineCapability({
  id: "finanzas.ventas_programacion.crear",
  descripcion:
    "Crea una programación de facturación recurrente para un cliente: líneas en CLP o UF, frecuencia, día de generación, plazo de pago y destinatarios. Queda pausada hasta activarla.",
  permiso: PERMISO_VENTAS,
  input: programacionBaseSchema,
  output: resultadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await validarProgramacion(ctx, input);
    if (dryRun) return { id: "", activa: false, proximaEjecucionEn: null };
    const creada = await ctx.transaccion(async (tx) => {
      const p = await tx.ventasProgramacion.create({
        data: {
          tenantId: ctx.tenantId,
          ...datosProgramacion(input),
          activa: false,
        },
        select: { id: true },
      });
      await escribirDetalle(tx, ctx.tenantId, p.id, input);
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.programacion.creada",
        entidadTipo: "ventas_programacion",
        entidadId: p.id,
        payload: {},
      });
      return p;
    });
    return { id: creada.id, activa: false, proximaEjecucionEn: null };
  },
});

export const ventasProgramacionActualizar = defineCapability({
  id: "finanzas.ventas_programacion.actualizar",
  descripcion:
    "Edita una programación de facturación recurrente: datos, líneas y destinatarios. Los borradores ya generados no cambian; aplica desde el próximo período.",
  permiso: PERMISO_VENTAS,
  input: programacionBaseSchema.extend({ programacionId: uuidSchema }),
  output: resultadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await cargar(ctx, input.programacionId);
    await validarProgramacion(ctx, input);
    if (dryRun) return { id: actual.id, activa: actual.activa, proximaEjecucionEn: null };
    await ctx.transaccion(async (tx) => {
      await tx.ventasProgramacionLinea.deleteMany({ where: { programacionId: actual.id } });
      await tx.ventasProgramacion.update({
        where: { id: actual.id },
        data: datosProgramacion(input),
      });
      await escribirDetalle(tx, ctx.tenantId, actual.id, input);
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.programacion.actualizada",
        entidadTipo: "ventas_programacion",
        entidadId: actual.id,
        payload: {},
      });
    });
    return recalcularProxima(ctx, actual.id);
  },
});

export const ventasProgramacionCambiarEstado = defineCapability({
  id: "finanzas.ventas_programacion.cambiar_estado",
  descripcion:
    "Activa o pausa una programación recurrente. Al activarla calcula la próxima generación sin repetir períodos facturados en OPAI 1.0 (fecha de corte y último período importado).",
  permiso: PERMISO_VENTAS,
  input: z.object({ programacionId: uuidSchema, activa: z.boolean() }),
  output: resultadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = await cargar(ctx, input.programacionId);
    if (input.activa) {
      const motivo = motivoNoActivable(p);
      if (motivo) throw reglaDeNegocio(motivo);
    }
    if (dryRun) {
      const proxima = input.activa ? await proximaEjecucionDe(ctx.db, ctx.tenantId, p) : null;
      return {
        id: p.id,
        activa: input.activa,
        proximaEjecucionEn: proxima ? proxima.toISOString().slice(0, 10) : null,
      };
    }
    await ctx.transaccion(async (tx) => {
      await tx.ventasProgramacion.update({ where: { id: p.id }, data: { activa: input.activa } });
      await ctx.eventos.emitir(tx, {
        tipo: input.activa ? "finanzas.programacion.activada" : "finanzas.programacion.pausada",
        entidadTipo: "ventas_programacion",
        entidadId: p.id,
        payload: {},
      });
    });
    return recalcularProxima(ctx, p.id);
  },
});
