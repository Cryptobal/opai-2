import { z } from "zod";

import { sinDuplicado } from "../core/maestros/comun";
import { conflicto, prohibido } from "../errores";
import type { Contexto } from "../types";
import { anotar } from "./anotar";
import {
  type AusenciaPersona,
  personaParaAusencia,
  planearAusencia,
  type PlanPuesto,
} from "./ausencias-plan";
import { aFechaDb } from "./comun";
import { tipoExcepcionSchema } from "./vistas";

export const salidaAusencia = z.object({
  /** Registro de la ausencia en el Núcleo (CAR-393); null en la vista previa. */
  ausenciaId: z.string().nullable(),
  personaId: z.string(),
  tipo: tipoExcepcionSchema,
  desde: z.string(),
  hasta: z.string(),
  /** Turnos de la persona que quedan con este permiso o licencia, por puesto. */
  puestos: z.array(
    z.object({
      puestoId: z.string(),
      puesto: z.string(),
      instalacion: z.string(),
      dias: z.number().int(),
    }),
  ),
  dias: z.number().int(),
});

/**
 * Escribe una ausencia (CAR-393): el registro de la persona y, si `conPauta`, los turnos que tiene como titular en esas
 * fechas, en la misma transacción. Sin pauta (empresa sin el módulo o persona sin turnos con `exigirTurnos: false`) queda
 * solo el registro. La usan `pauta.ausencias.registrar` (exige turnos) y `core.ausencias.registrar`.
 */
export async function escribirAusencia(
  ctx: Contexto,
  input: AusenciaPersona,
  o: { dryRun: boolean; conPauta: boolean; exigirTurnos: boolean; exigirPermisoPauta?: boolean },
): Promise<z.infer<typeof salidaAusencia>> {
  const planear = async (c: Contexto): Promise<PlanPuesto[]> => {
    if (!o.conPauta) {
      await personaParaAusencia(c, input.personaId);
      return [];
    }
    const plan = await planearAusencia(c, input, o.exigirTurnos);
    // Desde la ficha, marcar turnos pide editar la pauta (mismo criterio que anular la ausencia).
    if (o.exigirPermisoPauta && plan.some((p) => p.dias.length) && !c.autorizar("pauta:write"))
      throw prohibido("Marcar turnos de la pauta requiere el permiso de editar la pauta.");
    return plan;
  };
  const dryRun = o.dryRun;
  const hasta = input.hasta ?? input.desde;
  const resumen = (plan: PlanPuesto[], ausenciaId: string | null = null) => ({
    ausenciaId,
    personaId: input.personaId,
    tipo: input.tipo,
    desde: input.desde,
    hasta,
    puestos: plan.map((p) => ({
      puestoId: p.puesto.id,
      puesto: p.puesto.nombre,
      instalacion: p.puesto.instalacion,
      dias: p.dias.length,
    })),
    dias: plan.reduce((n, p) => n + p.dias.length, 0),
  });
  if (dryRun) return resumen(await planear(ctx));
  return ctx.transaccion(async (tx) => {
    const tctx = { ...ctx, db: tx };
    // Persona y luego puestos (mismo orden que fijar series y trasladar titular), en orden fijo; revalida dentro.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pauta:${ctx.tenantId}:${input.personaId}`}, 0))::text`;
    const previo = await planear(tctx);
    for (const p of previo)
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${p.puesto.id}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
    const plan = await planear(tctx);
    const bloqueados = new Set(previo.map((p) => p.puesto.id));
    if (plan.some((p) => !bloqueados.has(p.puesto.id)))
      throw conflicto(
        "La pauta de esta persona cambió mientras se registraba: vuelve a intentarlo.",
      );
    // El dato es el registro de la persona (CAR-393); las excepciones lo marcan en la pauta y apuntan a él.
    const usuario = ctx.usuario?.id ?? null;
    // Mismo instante en el registro y sus turnos: `registradaEn` sigue identificando el registro al anular.
    const ahora = new Date();
    const ausencia = await tx.ausencia.create({
      data: {
        tenantId: ctx.tenantId,
        personaId: input.personaId,
        tipo: input.tipo,
        desde: aFechaDb(input.desde),
        hasta: aFechaDb(hasta),
        motivo: input.motivo,
        estado: "aprobada",
        registradaPor: usuario,
        aprobadaPor: usuario,
        aprobadaEn: ahora,
        createdAt: ahora,
      },
      select: { id: true },
    });
    await sinDuplicado(
      tx.excepcionPauta.createMany({
        data: plan.flatMap((p) =>
          p.dias.map((f) => ({
            tenantId: ctx.tenantId,
            puestoId: p.puesto.id,
            fecha: aFechaDb(f),
            tipo: input.tipo,
            motivo: input.motivo,
            personaId: input.personaId,
            ausenciaId: ausencia.id,
            creadaPor: usuario,
            createdAt: ahora,
          })),
        ),
      }),
      "Ya hay una excepción activa en alguno de esos días: anúlala antes de registrar otra.",
    );
    for (const p of plan) {
      // El historial no copia el motivo (texto libre que puede ser de salud): queda en la excepción.
      await anotar(tx, ctx, {
        instalacionId: p.puesto.instalacionId,
        puestoId: p.puesto.id,
        accion: "excepcion_creada",
        desde: input.desde,
        hasta,
        detalle: {
          tipo: input.tipo,
          dias: p.dias.length,
          personaId: input.personaId,
          origen: "ficha",
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.excepcion.creada",
        entidadTipo: "puesto",
        entidadId: p.puesto.id,
        payload: { puestoId: p.puesto.id, tipo: input.tipo, desde: input.desde, hasta },
      });
    }
    return resumen(plan, ausencia.id);
  });
}
