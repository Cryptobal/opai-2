import { z } from "zod";
import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";
import { aFecha } from "./comun";
import type { FilaEstructura } from "./estructuras-vista";

export const impactoSchema = z.object({
  puestos: z.number().int(),
  personasRut: z.number().int(),
  borradores: z.number().int(),
  pendientesVinculo: z.number().int(),
  diferencias: z.array(z.object({ concepto: z.string(), antes: z.number().nullable(), despues: z.number().nullable(), diferencia: z.number().nullable() })),
});

/** Solo relaciones reales en PR 1; nunca atribuye una persona a una instalación por su cargo. */
export async function impactoCambio(
  ctx: Contexto, nivel: string, ref: string, fecha: string,
  antes: FilaEstructura | undefined,
  despues: { sueldoBase: number | null; colacion: number | null; movilizacion: number | null; gratificacionMonto: number | null },
) {
  const vigente = { estado: "vigente", vigenteDesde: { lte: aFecha(fecha) },
    OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFecha(fecha) } }] };
  let puestos = 0;
  if (nivel === "instalacion") {
    const filas = await ctx.db.puesto.findMany({ where: { instalacionId: ref, estado: "activo" } });
    const propias = await ctx.db.estructuraSueldo.findMany({
      where: { ...vigente, nivel: "puesto", puestoId: { in: filas.map((p) => p.id) } },
    });
    const ids = new Set(propias.map((p) => p.puestoId));
    puestos = filas.filter((p) => !ids.has(p.id)).length;
  } else if (nivel === "puesto") puestos = 1;
  const personasRut = nivel === "persona" ? 1 : 0;
  // Conteo del tenant, NO atribuido a esta instalación/puesto (fuente ausente hasta PR 3).
  const pendientesVinculo = ctx.alcance || nivel === "persona" || nivel === "cargo" ? 0
    : await ctx.db.vinculoLaboral.count({ where: { estado: "vigente" } });
  const diferencias = (["sueldoBase", "colacion", "movilizacion", "gratificacionMonto"] as const).map((concepto) => {
    if (!ctx.autorizar(PERMISOS_CORE.estructurasReadSensible))
      return { concepto, antes: null, despues: null, diferencia: null };
    const a = antes?.[concepto] ?? null;
    const d = despues[concepto];
    return { concepto, antes: a, despues: d, diferencia: a === null || d === null ? null : d - a };
  });
  return { puestos, personasRut, borradores: personasRut, pendientesVinculo, diferencias };
}
