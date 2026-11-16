import { z } from "zod";

import { instalacionesEnAlcance } from "../core/maestros/alcance";
import type { Contexto } from "../types";

/** Visitas que el actor ve: las de sus instalaciones si su rol acota por filas (ADR-022); si no, todas. */
export function dondeVisita(ctx: Contexto): { instalacionId?: { in: string[] } } {
  const ids = instalacionesEnAlcance(ctx);
  return ids ? { instalacionId: { in: [...ids] } } : {};
}

/** Un ítem de la lista de revisión al cerrar la visita (CAR-83, R3). */
export const itemVisitaSchema = z.object({
  texto: z.string().trim().min(1).max(120),
  resultado: z.enum(["cumple", "no_cumple", "no_aplica"]),
  nota: z.string().trim().max(500).nullable().default(null),
});

export const visitaSchema = z.object({
  id: z.string(),
  instalacionId: z.string(),
  instalacion: z.string(),
  supervisorId: z.string(),
  supervisor: z.string().nullable(),
  estado: z.enum(["en_curso", "cerrada"]),
  iniciadaEn: z.date(),
  cerradaEn: z.date().nullable(),
  distanciaM: z.number().int().nullable().describe("Metros entre la llegada y la instalación; nulo sin GPS."),
  geocerca: z.enum(["dentro", "fuera", "sin_gps", "sin_ubicacion"]),
  checklist: z.array(itemVisitaSchema),
  observaciones: z.string().nullable(),
});
export type Visita = z.infer<typeof visitaSchema>;

type Fila = {
  id: string;
  instalacionId: string;
  supervisorId: string;
  estado: string;
  iniciadaEn: Date;
  cerradaEn: Date | null;
  distanciaM: number | null;
  geocerca: string;
  checklist: unknown;
  observaciones: string | null;
};

/** Arma la vista de las visitas con el nombre de la instalación y del supervisor (miembro de esta empresa). */
export async function vistasDeVisitas(ctx: Contexto, filas: readonly Fila[]): Promise<Visita[]> {
  if (!filas.length) return [];
  const [inst, users] = await Promise.all([
    ctx.db.instalacion.findMany({ where: { id: { in: [...new Set(filas.map((f) => f.instalacionId))] } }, select: { id: true, nombre: true } }),
    ctx.db.user.findMany({
      where: { id: { in: [...new Set(filas.map((f) => f.supervisorId))] }, memberships: { some: { tenantId: ctx.tenantId } } },
      select: { id: true, name: true },
    }),
  ]);
  const nInst = new Map(inst.map((i) => [i.id, i.nombre]));
  const nUser = new Map(users.map((u) => [u.id, u.name]));
  return filas.map((f) => ({
    id: f.id,
    instalacionId: f.instalacionId,
    instalacion: nInst.get(f.instalacionId) ?? "",
    supervisorId: f.supervisorId,
    supervisor: nUser.get(f.supervisorId) ?? null,
    estado: f.estado as Visita["estado"],
    iniciadaEn: f.iniciadaEn,
    cerradaEn: f.cerradaEn,
    distanciaM: f.distanciaM,
    geocerca: f.geocerca as Visita["geocerca"],
    checklist: z.array(itemVisitaSchema).catch([]).parse(f.checklist),
    observaciones: f.observaciones,
  }));
}
