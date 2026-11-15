import { z } from "zod";

import { resolverMontoSugerido } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { uuidSchema } from "../core/esquemas";
import { dondePuesto } from "../core/maestros/alcance";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { aFechaDb, fechaIso } from "./comun";

export const PERMISO_APROBAR_EXTRA = "pauta:aprobar_extra";

export const turnoExtraSchema = z.object({
  id: z.string(),
  puestoId: z.string(),
  fecha: z.string(),
  personaId: z.string(),
  excepcionId: z.string(),
  tipoTrabajador: z.enum(["propio", "externo"]),
  montoClp: z.number().int().min(0),
  montoMotivo: z.string().nullable(),
  montoOrigen: z.enum(["puesto", "instalacion", "manual", "sin_tarifa"]),
  estado: z.enum(["por_aprobar", "aprobado", "rechazado"]),
  registradoPor: z.string().nullable(),
  resueltoPor: z.string().nullable(),
  resueltoEn: z.string().nullable(),
  motivoResolucion: z.string().nullable(),
});

export type VistaTurnoExtra = z.infer<typeof turnoExtraSchema>;

export function vistaTurnoExtra(f: {
  id: string;
  puestoId: string;
  fecha: Date;
  personaId: string;
  excepcionId: string;
  tipoTrabajador: string;
  montoClp: number;
  montoMotivo: string | null;
  montoOrigen: string;
  estado: string;
  registradoPor: string | null;
  resueltoPor: string | null;
  resueltoEn: Date | null;
  motivoResolucion: string | null;
}): VistaTurnoExtra {
  return turnoExtraSchema.parse({
    ...f,
    fecha: fechaIso(f.fecha),
    resueltoEn: f.resueltoEn?.toISOString() ?? null,
  });
}

/** Tarifas del puesto y de su instalación para sugerir el monto. */
export async function tarifasDe(ctx: Contexto, puestoId: string, instalacionId: string) {
  const filas = await ctx.db.tarifaTurnoExtra.findMany({
    where: {
      OR: [
        { sujetoTipo: "puesto", sujetoId: puestoId },
        { sujetoTipo: "instalacion", sujetoId: instalacionId },
      ],
    },
    select: { sujetoTipo: true, sujetoId: true, montoClp: true },
  });
  const puesto = filas.find((f) => f.sujetoTipo === "puesto" && f.sujetoId === puestoId);
  const inst = filas.find((f) => f.sujetoTipo === "instalacion" && f.sujetoId === instalacionId);
  return resolverMontoSugerido({
    montoPuesto: puesto?.montoClp ?? null,
    montoInstalacion: inst?.montoClp ?? null,
  });
}

/** Excepción activa de reemplazo o refuerzo dentro del alcance, o NOT_FOUND. */
export async function excepcionParaExtra(ctx: Contexto, excepcionId: string) {
  const ex = await ctx.db.excepcionPauta.findFirst({
    where: { id: excepcionId, estado: "activa", tipo: { in: ["reemplazo", "refuerzo"] } },
    select: { id: true, puestoId: true, fecha: true, personaId: true, tipo: true },
  });
  if (!ex?.personaId) throw noEncontrado("La excepción");
  const puesto = await ctx.db.puesto.findFirst({
    where: { id: ex.puestoId, estado: "activo", AND: [dondePuesto(ctx)] },
    select: { id: true, instalacionId: true },
  });
  if (!puesto) throw noEncontrado("La excepción");
  return { ...ex, personaId: ex.personaId, instalacionId: puesto.instalacionId };
}

export const idExtraSchema = z.object({ id: uuidSchema });

export function quienResuelveExtra(ctx: Contexto): string {
  const id = ctx.usuario?.id;
  if (!id) throw reglaDeNegocio("Se requiere un usuario autenticado.");
  return id;
}

/** Turno extra dentro del alcance del puesto, o NOT_FOUND. */
export async function turnoExtraPorAprobar(ctx: Contexto, id: string) {
  const t = await ctx.db.turnoExtra.findFirst({ where: { id } });
  if (!t) throw noEncontrado("El turno extra");
  const puesto = await ctx.db.puesto.findFirst({
    where: { id: t.puestoId, AND: [dondePuesto(ctx)] },
    select: { instalacionId: true },
  });
  if (!puesto) throw noEncontrado("El turno extra");
  return { t, instalacionId: puesto.instalacionId };
}

/** Crea el turno extra sobre una excepción ya escrita (misma transacción). */
export async function insertarTurnoExtra(
  tx: TenantTx,
  ctx: Contexto,
  args: {
    puestoId: string;
    instalacionId: string;
    fecha: string;
    personaId: string;
    excepcionId: string;
    tipoTrabajador: "propio" | "externo";
  },
) {
  const monto = await tarifasDe({ ...ctx, db: tx }, args.puestoId, args.instalacionId);
  return tx.turnoExtra.create({
    data: {
      tenantId: ctx.tenantId,
      puestoId: args.puestoId,
      fecha: aFechaDb(args.fecha),
      personaId: args.personaId,
      excepcionId: args.excepcionId,
      tipoTrabajador: args.tipoTrabajador,
      montoClp: monto.montoClp,
      montoMotivo: monto.motivoPorDefecto,
      montoOrigen: monto.origen,
      estado: "por_aprobar",
      registradoPor: ctx.usuario?.id ?? null,
    },
  });
}
