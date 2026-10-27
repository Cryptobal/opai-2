import { z } from "zod";
import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";
import { aFecha } from "./comun";
import type { FilaEstructura, FilaItem } from "./estructuras-vista";

export const impactoSchema = z.object({
  puestos: z.number().int(),
  personasRut: z.number().int(),
  borradores: z.number().int(),
  pendientesVinculo: z.number().int(),
  diferencias: z.array(
    z.object({
      concepto: z.string(),
      antes: z.union([z.number(), z.string()]).nullable(),
      despues: z.union([z.number(), z.string()]).nullable(),
      diferencia: z.number().nullable(),
    }),
  ),
});

/** Solo relaciones reales en PR 1; nunca atribuye una persona a una instalación por su cargo. */
export async function impactoCambio(
  ctx: Contexto,
  nivel: string,
  ref: string,
  fecha: string,
  antes: FilaEstructura | undefined,
  despues: {
    sueldoBase: number | null;
    colacion: number | null;
    movilizacion: number | null;
    gratificacionMonto: number | null;
    gratificacion: string | null;
  },
  itemsDespues: FilaItem[],
) {
  const vigente = {
    estado: "vigente",
    vigenteDesde: { lte: aFecha(fecha) },
    OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFecha(fecha) } }],
  };
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
  const pendientesVinculo =
    ctx.alcance || nivel === "persona" || nivel === "cargo"
      ? 0
      : await ctx.db.vinculoLaboral.count({ where: { estado: "vigente" } });
  const diferencias = (
    ["sueldoBase", "colacion", "movilizacion", "gratificacionMonto"] as const
  ).map((concepto) => {
    if (!ctx.autorizar(PERMISOS_CORE.estructurasReadSensible))
      return { concepto, antes: null, despues: null, diferencia: null };
    const a = antes?.[concepto] ?? null;
    const d = despues[concepto];
    return { concepto, antes: a, despues: d, diferencia: a === null || d === null ? null : d - a };
  });
  const itemsAntes = antes
    ? await ctx.db.estructuraItem.findMany({ where: { estructuraId: antes.id } })
    : [];
  const visible = ctx.autorizar(PERMISOS_CORE.estructurasReadSensible);
  const cambios: z.infer<typeof impactoSchema>["diferencias"] = diferencias;
  cambios.push({
    concepto: "Gratificación (modalidad)",
    antes: visible ? (antes?.gratificacion ?? null) : null,
    despues: visible ? despues.gratificacion : null,
    diferencia: null,
  });
  for (const nombre of new Set([...itemsAntes, ...itemsDespues].map((i) => i.nombre))) {
    const a = itemsAntes.find((i) => i.nombre === nombre);
    const d = itemsDespues.find((i) => i.nombre === nombre);
    const valor = (i: FilaItem | undefined) =>
      !i ? 0 : ((i.tipo === "bono_fijo" ? i.monto : i.porcentaje) ?? null);
    const av = visible ? valor(a) : null;
    const dv = visible ? valor(d) : null;
    for (const bandera of ["imponible", "tributable"] as const) {
      if (a?.[bandera] !== d?.[bandera])
        cambios.push({
          concepto: `Bono ${nombre}: ${bandera}`,
          antes: !visible || !a ? null : a[bandera] === false ? "No" : "Sí",
          despues: !visible || !d ? null : d[bandera] === false ? "No" : "Sí",
          diferencia: null,
        });
    }
    cambios.push({
      concepto: `Bono ${nombre} (${a?.tipo ?? "ausente"} → ${d?.tipo ?? "ausente"})`,
      antes: av,
      despues: dv,
      diferencia: av === null || dv === null || (a && d && a.tipo !== d.tipo) ? null : dv - av,
    });
  }
  return { puestos, personasRut, borradores: personasRut, pendientesVinculo, diferencias: cambios };
}
