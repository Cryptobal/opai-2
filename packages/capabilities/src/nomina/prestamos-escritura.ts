import { z } from "zod";

import { planDeCuotas } from "@opai/domain";

import type { TenantTx } from "@opai/db";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import type { Contexto } from "../types";
import { bloquearPeriodo, bloquearPrestamo, cambioConcurrente, exigirSinPeriodosCerrados } from "./bloqueos";
import { PERMISO_PRESTAMOS, documentoExiste, personaDe } from "./comun";
import { nombresDe } from "./novedades-vista";
import { prestamoSchema, vistaPrestamo } from "./prestamos-vista";

/** Crea un préstamo y su plan de cuotas mensuales sin interés. */
export const prestamosCrear = defineCapability({
  id: "nomina.prestamos.crear",
  descripcion:
    "Crea un préstamo a un trabajador con su plan de cuotas mensuales en pesos enteros y sin interés: monto total, número de cuotas (1 a 60) y mes de la primera cuota. La última cuota absorbe el resto. Las cuotas se aplican a cada período con nomina.prestamos.aplicar_cuotas.",
  permiso: PERMISO_PRESTAMOS,
  input: z.object({
    personaId: uuidSchema,
    montoTotal: z.number().int().positive().max(999_999_999),
    cuotas: z.number().int().min(1).max(60),
    primeraCuotaAnio: z.number().int().min(2000).max(2100),
    primeraCuotaMes: z.number().int().min(1).max(12),
    motivo: z.string().trim().max(200).optional(),
    documentoId: uuidSchema.optional().describe("Autorización escrita del trabajador."),
  }),
  output: prestamoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const persona = await personaDe(ctx, input.personaId);
    if (input.documentoId) await documentoExiste(ctx, input.documentoId);
    let plan;
    try {
      plan = planDeCuotas({ ...input, montoTotal: input.montoTotal });
    } catch (e) {
      throw reglaDeNegocio(e instanceof Error ? e.message : "Plan de cuotas inválido.");
    }
    const nombre = `${persona.apellidos}, ${persona.nombres}`;
    const base = {
      personaId: input.personaId,
      montoTotal: input.montoTotal,
      cuotas: input.cuotas,
      primeraCuotaAnio: input.primeraCuotaAnio,
      primeraCuotaMes: input.primeraCuotaMes,
      motivo: input.motivo ?? null,
      documentoId: input.documentoId ?? null,
      estado: "activo",
    };
    if (dryRun)
      return vistaPrestamo({ ...base, id: "" }, plan.map((c) => ({ ...c, id: "", estado: "pendiente" })), nombre);
    return ctx.transaccion(async (tx) => {
      const creado = await tx.nominaPrestamo.create({ data: { ...base, tenantId: ctx.tenantId } });
      const cuotas = [];
      for (const c of plan)
        cuotas.push(await tx.nominaCuota.create({ data: { ...c, estado: "pendiente", tenantId: ctx.tenantId, prestamoId: creado.id } }));
      await ctx.eventos.emitir(tx, {
        tipo: "nomina.prestamo.creado",
        entidadTipo: "prestamo",
        entidadId: creado.id,
        payload: { cuotas: input.cuotas },
      });
      return vistaPrestamo(creado, cuotas, nombre);
    });
  },
});

/** Cancela un préstamo: sus cuotas pendientes se condonan y se anulan las novedades abiertas. */
export const prestamosCancelar = defineCapability({
  id: "nomina.prestamos.cancelar",
  descripcion:
    "Cancela un préstamo activo con un motivo: las cuotas aún pendientes quedan condonadas y se anulan sus novedades en períodos abiertos o en revisión. Las cuotas ya descontadas en un período cerrado no cambian.",
  permiso: PERMISO_PRESTAMOS,
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(5).max(300) }),
  output: prestamoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, motivo }, { dryRun }) {
    const p = await ctx.db.nominaPrestamo.findUnique({ where: { id } });
    if (!p) throw noEncontrado("El préstamo");
    if (p.estado !== "activo") throw reglaDeNegocio("Solo se cancela un préstamo activo.");
    const plan = await ctx.db.nominaCuota.findMany({ where: { prestamoId: id } });
    const nombres = await nombresDe(ctx.db, [p.personaId]);
    const nombre = nombres.get(p.personaId) ?? "";
    const condonadas = plan.map((c) => (c.estado === "pendiente" ? { ...c, estado: "condonada" } : c));
    // La vista previa también rechaza lo que la ejecución rechazaría (períodos ya cerrados).
    const previas = await novedadesDeCuotas(ctx.db, plan);
    exigirSinPeriodosCerrados(previas.periodos);
    if (dryRun) return vistaPrestamo({ ...p, estado: "cancelado" }, condonadas, nombre);
    return ctx.transaccion(async (tx) => {
      // Orden único de bloqueo: períodos (por id) y después el préstamo. Con todo bloqueado se vuelve
      // a leer: un cierre o una aplicación de cuotas concurrentes no pueden quedar a medias.
      for (const periodoId of previas.periodoIds) await bloquearPeriodo(tx, ctx.tenantId, periodoId);
      const actual = await bloquearPrestamo(tx, ctx.tenantId, id);
      if (actual.estado !== "activo") throw reglaDeNegocio("Solo se cancela un préstamo activo.");
      const planActual = await tx.nominaCuota.findMany({ where: { prestamoId: id } });
      const hoy = await novedadesDeCuotas(tx, planActual);
      if (hoy.periodoIds.some((pid) => !previas.periodoIds.includes(pid))) throw cambioConcurrente();
      exigirSinPeriodosCerrados(hoy.periodos);
      const pendientes = planActual.filter((c) => c.estado === "pendiente").map((c) => c.id);
      await tx.nominaNovedad.updateMany({
        where: { id: { in: hoy.novedades.map((n) => n.id) }, estado: "vigente" },
        data: { estado: "anulada", anuladaEn: new Date(), motivoAnulacion: `Préstamo cancelado: ${motivo}` },
      });
      await tx.nominaCuota.updateMany({ where: { id: { in: pendientes }, estado: "pendiente" }, data: { estado: "condonada" } });
      const nuevo = await tx.nominaPrestamo.update({
        where: { id },
        data: { estado: "cancelado", canceladoEn: new Date(), motivo: `${actual.motivo ?? ""} · Cancelado: ${motivo}`.replace(/^ · /, "") },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "nomina.prestamo.cancelado",
        entidadTipo: "prestamo",
        entidadId: id,
        payload: { cuotasCondonadas: pendientes.length },
      });
      return vistaPrestamo(nuevo, planActual.map((c) => (c.estado === "pendiente" ? { ...c, estado: "condonada" } : c)), nombre);
    });
  },
});

type Db = Contexto["db"] | TenantTx;

/** Novedades vigentes de las cuotas aún pendientes y los períodos (ordenados por id) que tocan. */
async function novedadesDeCuotas(db: Db, plan: { id: string; estado: string }[]) {
  const pendientes = plan.filter((c) => c.estado === "pendiente").map((c) => c.id);
  const novedades = await db.nominaNovedad.findMany({
    where: { prestamoCuotaId: { in: pendientes }, estado: "vigente" },
    select: { id: true, periodoId: true },
  });
  const periodoIds = [...new Set(novedades.map((n) => n.periodoId))].sort();
  const periodos = await db.nominaPeriodo.findMany({ where: { id: { in: periodoIds } } });
  return { novedades, periodoIds, periodos };
}
