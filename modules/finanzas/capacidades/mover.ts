import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { calcularPlanilla, lunesDe, planificarMovimiento, semanasDesde, sumarSemanas } from "../domain";
import { saldoSchema, semanaSchema, uuidSchema } from "./esquemas";
import { PERMISO_GESTIONAR } from "./permisos";
import { aFecha, ajustesDe, aIso, bloquearSemanaFlujo, cargarFlujo, filaDe } from "./util";
import { sincronizarAvisosEnTx } from "./aviso";
import { reglaDeNegocio } from "@opai/capabilities";

export const celdasMover = defineCapability({
  id: "finanzas.celdas.mover",
  descripcion:
    "Reprograma las cifras planificadas de una fila ± N semanas (con arrastre de las siguientes si la fila lo pide) y devuelve el saldo resultante; no mueve lo comprometido ni lo real. Mover a una semana pasada exige confirmarSemanaPasada.",
  permiso: PERMISO_GESTIONAR,
  input: z.object({
    filaId: uuidSchema,
    semanas: z.array(semanaSchema).min(1).max(52),
    por: z.number().int().min(-26).max(26).describe("Semanas a mover; negativo adelanta."),
    confirmarSemanaPasada: z
      .boolean()
      .optional()
      .describe("Obligatorio true si el movimiento toca una semana anterior al lunes actual."),
  }),
  output: z.object({
    movimientos: z.array(
      z.object({ desde: semanaSchema, hasta: semanaSchema, monto: z.number().int() }),
    ),
    saldos: z.array(z.object({ semana: semanaSchema, saldoFinal: saldoSchema })),
    avisoSemanaPasada: z
      .boolean()
      .optional()
      .describe("true en dry_run cuando el movimiento toca una semana pasada (requiere confirmación al aplicar)."),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const fila = await filaDe(ctx, input.filaId);
    const ajustes = await ajustesDe(ctx);
    const todas = [...input.semanas].sort();
    const hasta = sumarSemanas(todas.at(-1) as string, Math.max(input.por, 0) + 52);
    const base = ajustes.desde < (todas[0] as string) ? ajustes.desde : (todas[0] as string);
    const { celdas, dominio, celdasDom } = await cargarFlujo(ctx, base, hasta);
    const hoy = lunesDe(new Date().toISOString().slice(0, 10));
    const plan = planificarMovimiento({
      fila: { id: fila.id, seccion: fila.seccion as "ingreso", arrastre: fila.arrastre },
      celdas: celdasDom,
      semanas: input.semanas,
      por: input.por,
    });
    if (!plan.ok) throw reglaDeNegocio(plan.motivo);
    const tocaPasada = plan.movimientos.some((m) => m.desde < hoy || m.hasta < hoy);
    if (tocaPasada && !dryRun && !input.confirmarSemanaPasada)
      throw reglaDeNegocio(
        "El movimiento afecta una semana pasada: confirma con confirmarSemanaPasada antes de aplicar.",
      );
    const origen = new Set(plan.movimientos.map((m) => m.desde));
    const tras = celdasDom.filter((c) => !(c.filaId === fila.id && origen.has(c.semana)));
    for (const m of plan.movimientos) {
      const i = tras.findIndex((c) => c.filaId === fila.id && c.semana === m.hasta);
      if (i >= 0)
        tras[i] = {
          ...(tras[i] as (typeof tras)[number]),
          monto: (tras[i] as { monto: number }).monto + m.monto,
        };
      else tras.push({ filaId: fila.id, semana: m.hasta, capa: "plan", monto: m.monto });
    }
    const rango = semanasDesde(base, 52 + Math.max(input.por, 0) + 26);
    const calculo = calcularPlanilla({
      saldoInicial: ajustes.saldoInicial,
      umbral: ajustes.umbral,
      semanas: rango,
      filas: dominio,
      celdas: tras,
    });
    const saldos = calculo
      .filter((s) => s.semana >= (todas[0] as string))
      .slice(0, 26)
      .map((s) => ({ semana: s.semana, saldoFinal: s.saldoFinal }));
    const resultado = {
      movimientos: plan.movimientos,
      saldos,
      ...(tocaPasada && dryRun ? { avisoSemanaPasada: true as const } : {}),
    };
    if (dryRun) return resultado;
    await ctx.transaccion(async (tx) => {
      const semanasLock = new Set([
        ...plan.movimientos.map((m) => m.desde),
        ...plan.movimientos.map((m) => m.hasta),
      ]);
      for (const s of semanasLock) {
        await bloquearSemanaFlujo(tx, ctx, s);
      }
      const filas = celdas.filter((c) => c.filaId === fila.id);
      const poSemana = new Map(filas.map((c) => [aIso(c.semana), c]));
      for (const m of plan.movimientos)
        await tx.flujoCelda.delete({ where: { id: (poSemana.get(m.desde) as { id: string }).id } });
      for (const m of plan.movimientos) {
        const destino = poSemana.get(m.hasta);
        const origenFila = poSemana.get(m.desde) as { nota: string | null };
        if (destino && !origen.has(m.hasta))
          await tx.flujoCelda.update({
            where: { id: destino.id },
            data: { monto: BigInt(Number(destino.monto) + m.monto) },
          });
        else
          await tx.flujoCelda.create({
            data: {
              tenantId: ctx.tenantId,
              filaId: fila.id,
              semana: aFecha(m.hasta),
              capa: "plan",
              monto: BigInt(m.monto),
              nota: origenFila.nota,
            },
          });
      }
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.celdas_movidas",
        entidadTipo: "flujoFila",
        entidadId: fila.id,
        payload: { por: input.por, celdas: plan.movimientos.length },
      });
      await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
    });
    return resultado;
  },
});
