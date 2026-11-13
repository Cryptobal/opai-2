import { z } from "zod";

import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { anotar } from "./anotar";
import { ausenciaPersonaInput, planearAusencia, type PlanPuesto } from "./ausencias-plan";
import { aFechaDb, PERMISO_WRITE } from "./comun";
import { tipoExcepcionSchema } from "./vistas";

const salida = z.object({
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
 * Registra un permiso, licencia, vacaciones o ausencia desde la ficha de la persona (ADR-094, adenda CAR-311 d): los
 * turnos que tiene como titular en esas fechas quedan como excepción en la pauta mensual y diaria, con el motivo, y
 * el ausentismo de Desempeño los cuenta como justificados.
 */
export const ausenciasRegistrar = defineCapability({
  id: "pauta.ausencias.registrar",
  descripcion:
    "Registra un permiso, licencia, vacaciones o ausencia de una persona para un día o un rango: cada turno que tiene como titular en la pauta en esas fechas queda como excepción con ese motivo (puesto por cubrir), en todos sus puestos. Es lo que se ingresa desde la ficha del guardia; se anula sin borrar el historial.",
  permiso: PERMISO_WRITE,
  input: ausenciaPersonaInput,
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const hasta = input.hasta ?? input.desde;
    const resumen = (plan: PlanPuesto[]) => ({
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
    if (dryRun) return resumen(await planearAusencia(ctx, input));
    return ctx.transaccion(async (tx) => {
      const tctx = { ...ctx, db: tx };
      // Bloquea los puestos de la persona en orden fijo y revalida dentro (series, días y repeticiones).
      const previo = await planearAusencia(tctx, input);
      for (const p of previo)
        await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${p.puesto.id}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const plan = await planearAusencia(tctx, input);
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
              creadaPor: ctx.usuario?.id ?? null,
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
          detalle: { tipo: input.tipo, dias: p.dias.length },
        });
        await ctx.eventos.emitir(tx, {
          tipo: "pauta.excepcion.creada",
          entidadTipo: "puesto",
          entidadId: p.puesto.id,
          payload: { puestoId: p.puesto.id, tipo: input.tipo, desde: input.desde, hasta },
        });
      }
      return resumen(plan);
    });
  },
});
