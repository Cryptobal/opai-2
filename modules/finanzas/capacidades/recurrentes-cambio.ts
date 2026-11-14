import { z } from "zod";

import { defineCapability, hoyChile, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import type { Frecuencia, Recurrente } from "../domain/recurrentes";
import { cuotasQueCambian, partirEn } from "../domain/recurrentes-tramo";
import { uuidSchema } from "./esquemas";
import { PERMISO_CONFIGURAR } from "./permisos";
import { motivoInvalido, recurrenteDatos, recurrenteSchema, vistaRecurrente } from "./recurrentes-esquemas";
import { aFecha, filaDe, ID_VISTA_PREVIA } from "./util";

const fechas = z.array(z.string());

/**
 * Cambia la fila, la frecuencia o el día de pago de un gasto recurrente desde una fecha (CAR-413, referente Xero y
 * QuickBooks): las cuotas anteriores, pagadas o no, quedan en el tramo que se cierra el día antes; desde la fecha
 * rige un tramo nuevo enlazado al anterior. Si el gasto aún no empieza, el cambio se aplica en el mismo gasto.
 */
export const recurrentesCambiarDesde = defineCapability({
  id: "finanzas.recurrentes.cambiar_desde",
  descripcion:
    "Cambia desde una fecha la fila del flujo, la frecuencia o el día de pago de un gasto recurrente (por ejemplo, el arriendo pasa de mensual a cada dos semanas). Las cuotas anteriores a esa fecha y las ya pagadas con el banco no cambian; la vista previa muestra las próximas cuotas antes y después.",
  permiso: PERMISO_CONFIGURAR,
  input: z.object({
    id: uuidSchema,
    desde: recurrenteDatos.inicio.describe("Desde qué día rige el cambio (aaaa-mm-dd). Hoy o una fecha futura."),
    filaId: uuidSchema.optional().describe("Nueva fila de egresos; si no se indica, sigue en la misma."),
    frecuencia: recurrenteDatos.frecuencia.optional(),
    diaDelMes: recurrenteDatos.diaDelMes.unwrap().unwrap().nullable().optional(),
  }),
  output: z.object({
    anterior: recurrenteSchema.nullable().describe("Tramo que se cierra el día antes; null si el gasto aún no empezaba."),
    nuevo: recurrenteSchema,
    cuotas: z.object({ antes: fechas, despues: fechas }).describe("Próximas cuotas desde la fecha (hasta 12, un año), antes y después del cambio."),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.flujoRecurrente.findFirst({ where: { id: input.id }, include: { siguiente: { select: { id: true } } } });
    if (!actual) throw noEncontrado("El gasto recurrente");
    if (actual.siguiente) throw reglaDeNegocio("Ese tramo ya fue reemplazado: cambia el tramo vigente.");
    if (!actual.activa) throw reglaDeNegocio("Reactiva el gasto antes de cambiarlo.");
    if (input.desde < hoyChile()) throw reglaDeNegocio("El cambio rige desde hoy o una fecha futura: las cuotas pasadas no se tocan.");
    const vista = vistaRecurrente(actual);
    const frecuencia = input.frecuencia ?? vista.frecuencia;
    const diaDelMes = frecuencia === "mensual" ? (input.diaDelMes !== undefined ? input.diaDelMes : vista.diaDelMes) : null;
    const filaId = input.filaId ?? vista.filaId;
    if (filaId === vista.filaId && frecuencia === vista.frecuencia && diaDelMes === vista.diaDelMes)
      throw reglaDeNegocio("Indica qué cambia: la fila, la frecuencia o el día de pago.");
    if (filaId !== vista.filaId) {
      const fila = await filaDe(ctx, filaId);
      if (fila.seccion !== "egreso" || !fila.activa) throw reglaDeNegocio("Elige una fila de egresos activa.");
    }
    const regla: Recurrente = { frecuencia: vista.frecuencia as Frecuencia, diaDelMes: vista.diaDelMes, inicio: vista.inicio, fin: vista.fin, repeticiones: vista.repeticiones };
    const tramos = partirEn(regla, input.desde, { frecuencia, diaDelMes });
    if ("motivo" in tramos) throw reglaDeNegocio(tramos.motivo);
    const motivo = motivoInvalido({ ...vista, ...tramos.nuevo });
    if (motivo) throw reglaDeNegocio(motivo);
    const cuotas = cuotasQueCambian(regla, tramos.nuevo, input.desde);
    const datosNuevo = {
      filaId,
      frecuencia,
      diaDelMes,
      inicio: aFecha(tramos.nuevo.inicio),
      fin: tramos.nuevo.fin ? aFecha(tramos.nuevo.fin) : null,
      repeticiones: tramos.nuevo.repeticiones,
    };
    if (tramos.tipo === "en_lugar") {
      if (dryRun) return { anterior: null, nuevo: vistaRecurrente({ ...actual, ...datosNuevo }), cuotas };
      const u = await ctx.transaccion(async (tx) => {
        const r = await tx.flujoRecurrente.update({ where: { id: actual.id }, data: datosNuevo });
        await ctx.eventos.emitir(tx, { tipo: "finanzas.flujo.recurrente_actualizado", entidadTipo: "flujoRecurrente", entidadId: r.id });
        return r;
      });
      return { anterior: null, nuevo: vistaRecurrente(u), cuotas };
    }
    const finAnterior = aFecha(tramos.anterior.fin as string);
    const base = { ...actual, ...datosNuevo, claveOrigen: null, anteriorId: actual.id };
    if (dryRun) return { anterior: vistaRecurrente({ ...actual, fin: finAnterior }), nuevo: vistaRecurrente({ ...base, id: ID_VISTA_PREVIA }), cuotas };
    const [anterior, nuevo] = await ctx.transaccion(async (tx) => {
      const a = await tx.flujoRecurrente.update({ where: { id: actual.id }, data: { fin: finAnterior } });
      const n = await tx.flujoRecurrente.create({
        data: {
          tenantId: ctx.tenantId,
          concepto: actual.concepto,
          monto: actual.monto,
          unidad: actual.unidad,
          politicaUf: actual.politicaUf,
          ufDiaFijo: actual.ufDiaFijo,
          ...datosNuevo,
          ventanaAntes: actual.ventanaAntes,
          ventanaDespues: actual.ventanaDespues,
          nota: actual.nota,
          activa: true,
          anteriorId: actual.id,
        },
      });
      await ctx.eventos.emitir(tx, { tipo: "finanzas.flujo.recurrente_actualizado", entidadTipo: "flujoRecurrente", entidadId: a.id });
      await ctx.eventos.emitir(tx, { tipo: "finanzas.flujo.recurrente_creado", entidadTipo: "flujoRecurrente", entidadId: n.id });
      return [a, n] as const;
    });
    return { anterior: vistaRecurrente(anterior), nuevo: vistaRecurrente(nuevo), cuotas };
  },
});

