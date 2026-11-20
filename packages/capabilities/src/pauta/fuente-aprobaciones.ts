import { formatearClp } from "@opai/domain";

import type { FuenteAprobaciones } from "../core/aprobaciones-fuentes";
import { dondePuesto } from "../core/maestros/alcance";
import type { Contexto } from "../types";
import { PERMISO_APROBAR_EXTRA } from "./turnos-extra-comun";

async function dondeTurnosExtra(ctx: Contexto) {
  const yo = ctx.usuario?.id ?? "";
  if (!yo) return null;
  const puestos = await ctx.db.puesto.findMany({
    where: { estado: "activo", AND: [dondePuesto(ctx)] },
    select: { id: true, nombre: true, instalacionId: true },
  });
  if (!puestos.length) return null;
  const inst = new Map(
    (
      await ctx.db.instalacion.findMany({
        where: { id: { in: [...new Set(puestos.map((p) => p.instalacionId))] } },
        select: { id: true, nombre: true },
      })
    ).map((i) => [i.id, i.nombre]),
  );
  const puestoPorId = new Map(puestos.map((p) => [p.id, p]));
  return {
    where: {
      estado: "por_aprobar",
      puestoId: { in: puestos.map((p) => p.id) },
      OR: [{ registradoPor: null }, { registradoPor: { not: yo } }],
    },
    puestoPorId,
    inst,
  };
}

/** Turnos extra por aprobar (CAR-620 / CAR-96): misma regla que la capacidad de resolver. */
export const fuentesAprobacionTurnosExtra: readonly FuenteAprobaciones[] = [
  {
    modulo: "pauta",
    origen: "pauta_turnos_extra",
    titulo: "Turnos extra",
    permisos: [PERMISO_APROBAR_EXTRA],
    async contar(ctx) {
      const q = await dondeTurnosExtra(ctx);
      if (!q) return 0;
      return ctx.db.turnoExtra.count({ where: q.where });
    },
    async listar(ctx, limite) {
      const q = await dondeTurnosExtra(ctx);
      if (!q) return [];
      const filas = await ctx.db.turnoExtra.findMany({
        where: q.where,
        orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
        take: limite,
      });
      const personas = new Map(
        (
          await ctx.db.persona.findMany({
            where: { id: { in: [...new Set(filas.map((f) => f.personaId))] } },
            select: { id: true, nombres: true, apellidos: true },
          })
        ).map((p) => [p.id, `${p.nombres} ${p.apellidos}`.trim()]),
      );
      return filas.map((t) => {
        const puesto = q.puestoPorId.get(t.puestoId);
        const inst = puesto ? q.inst.get(puesto.instalacionId) : null;
        return {
          id: t.id,
          resumen: `${t.fecha.toISOString().slice(0, 10)} · ${inst ?? "Instalación"} · ${puesto?.nombre ?? "Puesto"} · ${personas.get(t.personaId) ?? "Persona"} · ${formatearClp(t.montoClp)}`,
          href: `/pauta/turnos-extra?ver=${encodeURIComponent(t.id)}`,
          creadaEn: t.createdAt.toISOString(),
        };
      });
    },
  },
];