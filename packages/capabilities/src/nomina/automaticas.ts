import { z } from "zod";

import type { TenantTx } from "@opai/db";

import { anticiposDelPeriodo, type ReglaAnticipo } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { aFecha } from "../core/maestros/comun";
import { bloquearPeriodoAbierto, bloquearPrestamo } from "./bloqueos";
import type { Contexto } from "../types";
import { PERMISO_ANTICIPOS, PERMISO_PRESTAMOS, periodoDe } from "./comun";
import { exigirPeriodoAbierto } from "./novedades-util";

const resultadoSchema = z.object({
  generadas: z.number().int(),
  yaExistentes: z.number().int().describe("Ya estaban cargadas (o anuladas a propósito); no se repiten."),
  omitidas: z.array(z.object({ personaId: z.uuid(), motivo: z.string() })),
});

/** Genera los anticipos quincenales del período desde las reglas activas (B2). Idempotente. */
export const anticiposGenerar = defineCapability({
  id: "nomina.anticipos.generar",
  descripcion:
    "Genera como novedades los anticipos quincenales del período para las personas con regla activa de monto fijo. Es idempotente: no repite un anticipo ya cargado ni vuelve a crear uno anulado. Las reglas por porcentaje se omiten hasta que el motor de sueldos entregue el sueldo base.",
  permiso: PERMISO_ANTICIPOS,
  input: z.object({ periodoId: uuidSchema }),
  output: resultadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { periodoId }, { dryRun }) {
    const periodo = await periodoDe(ctx, periodoId);
    exigirPeriodoAbierto(periodo);
    const reglas = await ctx.db.nominaReglaAnticipo.findMany({});
    const { generados, omitidos } = anticiposDelPeriodo(
      reglas.map((r): ReglaAnticipo => ({
        personaId: r.personaId,
        activa: r.activa,
        modo: r.modo as ReglaAnticipo["modo"],
        valor: r.valor,
        diaMes: r.diaMes,
      })),
      periodo.anio,
      periodo.mes,
    );
    const previas = await ctx.db.nominaNovedad.findMany({
      where: { periodoId, origen: "anticipo_quincenal" },
      select: { personaId: true, fechaDesde: true },
    });
    const clave = (persona: string, fecha: string) => `${persona}|${fecha}`;
    const hechas = new Set(previas.map((n) => clave(n.personaId, n.fechaDesde.toISOString().slice(0, 10))));
    const nuevas = generados.filter((g) => !hechas.has(clave(g.personaId, g.fecha)));
    const salida = {
      generadas: nuevas.length,
      yaExistentes: generados.length - nuevas.length,
      omitidas: omitidos.filter((o) => o.motivo !== "inactiva").map((o) => ({ personaId: o.personaId, motivo: o.motivo })),
    };
    if (dryRun || nuevas.length === 0) return salida;
    return ctx.transaccion(async (tx) => {
      await bloquearPeriodoAbierto(tx, ctx.tenantId, periodoId);
      const vistas = await tx.nominaNovedad.findMany({
        where: { periodoId, origen: "anticipo_quincenal" },
        select: { personaId: true, fechaDesde: true },
      });
      const yaHechas = new Set(vistas.map((n) => clave(n.personaId, n.fechaDesde.toISOString().slice(0, 10))));
      for (const n of nuevas.filter((g) => !yaHechas.has(clave(g.personaId, g.fecha))))
        await tx.nominaNovedad.create({
          data: {
            tenantId: ctx.tenantId,
            periodoId,
            personaId: n.personaId,
            tipo: "anticipo",
            estado: "vigente",
            origen: "anticipo_quincenal",
            fechaDesde: aFecha(n.fecha),
            montoClp: n.monto,
          },
        });
      await ctx.eventos.emitir(tx, {
        tipo: "nomina.novedad.registrada",
        entidadTipo: "periodo",
        entidadId: periodoId,
        payload: { periodoId, cantidad: nuevas.length, origen: "anticipo_quincenal" },
      });
      return salida;
    });
  },
});

/** Aplica al período las cuotas de préstamo que vencen en su mes (B3). Idempotente. */
export const prestamosAplicarCuotas = defineCapability({
  id: "nomina.prestamos.aplicar_cuotas",
  descripcion:
    "Aplica a un período abierto o en revisión las cuotas de préstamo pendientes que vencen en su mes, como novedades de tipo préstamo. Es idempotente: una cuota ya aplicada no se repite. Las cuotas quedan descontadas al cerrar el período.",
  permiso: PERMISO_PRESTAMOS,
  input: z.object({ periodoId: uuidSchema }),
  output: resultadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { periodoId }, { dryRun }) {
    const periodo = await periodoDe(ctx, periodoId);
    exigirPeriodoAbierto(periodo);
    const { pendientes, salida } = await cuotasAplicables(ctx.db, periodo);
    if (dryRun || pendientes.length === 0) return salida;
    return ctx.transaccion(async (tx) => {
      await bloquearPeriodoAbierto(tx, ctx.tenantId, periodoId);
      for (const id of [...new Set(pendientes.map((c) => c.prestamoId))].sort()) await bloquearPrestamo(tx, ctx.tenantId, id);
      // Con período y préstamos bloqueados, se recalcula: una cancelación o un cierre concurrentes
      // ya no pueden dejar una cuota condonada convertida en novedad.
      const { pendientes: vigentes, prestamos: activos, salida: resultado } = await cuotasAplicables(tx, periodo);
      for (const c of vigentes)
        await tx.nominaNovedad.create({
          data: {
            tenantId: ctx.tenantId,
            periodoId,
            personaId: activos.get(c.prestamoId)?.personaId ?? "",
            tipo: "prestamo",
            estado: "vigente",
            origen: "prestamo_cuota",
            fechaDesde: periodo.inicio,
            montoClp: c.monto,
            prestamoCuotaId: c.id,
          },
        });
      await ctx.eventos.emitir(tx, {
        tipo: "nomina.novedad.registrada",
        entidadTipo: "periodo",
        entidadId: periodoId,
        payload: { periodoId, cantidad: vigentes.length, origen: "prestamo_cuota" },
      });
      return resultado;
    });
  },
});

type Periodo = Awaited<ReturnType<typeof periodoDe>>;

/** Cuotas pendientes que vencen en el mes del período y aún no son novedad (con `ctx.db` o con `tx`). */
async function cuotasAplicables(db: Contexto["db"] | TenantTx, periodo: Periodo) {
    const cuotas = await db.nominaCuota.findMany({
      where: { anio: periodo.anio, mes: periodo.mes, estado: "pendiente" },
    });
    const activos = await db.nominaPrestamo.findMany({
      where: { id: { in: cuotas.map((c) => c.prestamoId) }, estado: "activo" },
    });
    const prestamos = new Map(activos.map((p) => [p.id, p]));
    const aplicadas = await db.nominaNovedad.findMany({
      where: { prestamoCuotaId: { in: cuotas.map((c) => c.id) }, estado: "vigente" },
      select: { prestamoCuotaId: true },
    });
    const hechas = new Set(aplicadas.map((n) => n.prestamoCuotaId));
    const pendientes = cuotas.filter((c) => prestamos.has(c.prestamoId) && !hechas.has(c.id));
    const salida = {
      generadas: pendientes.length,
      yaExistentes: cuotas.filter((c) => hechas.has(c.id)).length,
      omitidas: [],
    };
  return { pendientes, prestamos, salida };
}
