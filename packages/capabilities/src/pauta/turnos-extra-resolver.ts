import { z } from "zod";

import { motivoMontoFaltante, motivoNoResolver, type EstadoTurnoExtra } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { fechaIso } from "./comun";
import { dondeTurnoExtra, PERMISO_APROBAR_EXTRA, turnoExtraSchema, vistaTurnoExtra } from "./turnos-extra-comun";

/** El turno visible y resoluble por el actor, o el error que corresponde (sin enumerar otros tenants). */
async function turnoParaResolver(ctx: Contexto, id: string) {
  const usuarioId = ctx.usuario?.id;
  if (!usuarioId) throw reglaDeNegocio("Resolver un turno extra exige una persona responsable.");
  const t = await ctx.db.turnoExtra.findFirst({ where: { id, AND: [dondeTurnoExtra(ctx)] } });
  if (!t) throw noEncontrado("El turno extra");
  const motivo = motivoNoResolver({ estado: t.estado as EstadoTurnoExtra, registradoPor: t.registradoPor }, usuarioId);
  if (motivo) throw reglaDeNegocio(motivo);
  return { t, usuarioId };
}

/** Cambia el estado solo si sigue por aprobar: dos aprobaciones simultáneas no se pisan. */
async function resolver(ctx: Contexto, id: string, data: Record<string, unknown>, evento: string) {
  return ctx.transaccion(async (tx) => {
    const r = await tx.turnoExtra.updateMany({ where: { id, estado: "por_aprobar" }, data });
    if (r.count === 0) throw conflicto("El turno extra ya fue resuelto.");
    const t = await tx.turnoExtra.findUniqueOrThrow({ where: { id } });
    await ctx.eventos.emitir(tx, {
      tipo: evento,
      entidadTipo: "turno_extra",
      entidadId: t.id,
      payload: { turnoExtraId: t.id, instalacionId: t.instalacionId, puestoId: t.puestoId, fecha: fechaIso(t.fecha) },
    });
    return vistaTurnoExtra(t);
  });
}

/** Aprueba un turno extra, opcionalmente con otro monto y su motivo (ADR-083, puntos 2 y 3). */
export const turnosExtraAprobar = defineCapability({
  id: "pauta.turnos_extra.aprobar",
  descripcion:
    "Aprueba un turno extra por aprobar. Quien aprueba puede cambiar el monto indicando el motivo, que queda en la auditoría; nadie aprueba un turno que registró. Aprobar no mueve plata ni se informa a Nómina.",
  permiso: PERMISO_APROBAR_EXTRA,
  input: z.object({
    turnoExtraId: uuidSchema,
    montoClp: z.number().int().min(0).max(10_000_000).optional().describe("Monto final en CLP; por defecto, el sugerido."),
    montoMotivo: z.string().trim().min(3).max(300).optional(),
  }),
  output: turnoExtraSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { t, usuarioId } = await turnoParaResolver(ctx, input.turnoExtraId);
    const montoClp = input.montoClp ?? t.montoClp;
    if (motivoMontoFaltante(t.montoSugeridoClp, montoClp, input.montoMotivo ?? t.montoMotivo))
      throw reglaDeNegocio("Indica el motivo del cambio de monto.");
    const data = {
      estado: "aprobado",
      montoClp,
      montoMotivo: input.montoMotivo ?? t.montoMotivo,
      resueltoPor: usuarioId,
      resueltoEn: new Date(),
    };
    if (dryRun) return vistaTurnoExtra({ ...t, ...data });
    return resolver(ctx, t.id, data, "pauta.turno_extra.aprobado");
  },
});

/** Rechaza un turno extra con su motivo; la cobertura del día no cambia. */
export const turnosExtraRechazar = defineCapability({
  id: "pauta.turnos_extra.rechazar",
  descripcion:
    "Rechaza un turno extra por aprobar con un motivo obligatorio. La cobertura del puesto ese día no cambia: el reemplazo o refuerzo sigue en la pauta. Nadie rechaza un turno que registró.",
  permiso: PERMISO_APROBAR_EXTRA,
  input: z.object({ turnoExtraId: uuidSchema, motivo: z.string().trim().min(3).max(300) }),
  output: turnoExtraSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { t, usuarioId } = await turnoParaResolver(ctx, input.turnoExtraId);
    const data = { estado: "rechazado", motivoResolucion: input.motivo, resueltoPor: usuarioId, resueltoEn: new Date() };
    if (dryRun) return vistaTurnoExtra({ ...t, ...data });
    return resolver(ctx, t.id, data, "pauta.turno_extra.rechazado");
  },
});
