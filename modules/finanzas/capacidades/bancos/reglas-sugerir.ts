import { z } from "zod";

import type { Contexto } from "@opai/capabilities";
import { ordenarReglas, reglaCalza } from "@opai/domain";

import { montoDe } from "./esquemas";
import { nombresDestino, reglaEvaluable } from "./reglas-esquemas";

export const sugerenciaReglaSchema = z.object({
  reglaId: z.string(),
  nombre: z.string(),
  flujoFilaId: z.string(),
  filaEtiqueta: z.string(),
  cuentaContableId: z.string().nullable(),
  cuentaContable: z.string().nullable(),
});

type Mov = { monto: bigint | number; glosa: string; referencia: string | null };

/**
 * Reglas activas que calzan con el movimiento y cuya fila es de su misma sección (abono → ingreso,
 * cargo → egreso), en orden de prioridad. Son sugerencias: la persona confirma con un clic (ADR-074).
 */
export async function reglasQueCalzan(ctx: Contexto, m: Mov): Promise<z.infer<typeof sugerenciaReglaSchema>[]> {
  const filas = await ctx.db.reglaConciliacion.findMany({ where: { activa: true, flujoFilaId: { not: null } } });
  const mov = { monto: montoDe(m.monto), glosa: m.glosa, referencia: m.referencia };
  const calzan = ordenarReglas(filas.flatMap((r) => {
    const e = reglaEvaluable(r);
    return e && reglaCalza(e, mov) ? [e] : [];
  }));
  if (!calzan.length) return [];
  const seccion = mov.monto > 0 ? "ingreso" : "egreso";
  const activas = await ctx.db.flujoFila.findMany({
    where: { id: { in: calzan.map((r) => r.flujoFilaId as string) }, activa: true, seccion },
    select: { id: true },
  });
  const validas = new Set(activas.map((f) => f.id));
  const enSeccion = calzan.filter((r) => r.flujoFilaId && validas.has(r.flujoFilaId));
  const n = await nombresDestino(
    ctx,
    enSeccion.map((r) => r.flujoFilaId as string),
    enSeccion.flatMap((r) => (r.cuentaContableId ? [r.cuentaContableId] : [])),
  );
  return enSeccion.slice(0, 3).map((r) => ({
    reglaId: r.id,
    nombre: r.nombre,
    flujoFilaId: r.flujoFilaId as string,
    filaEtiqueta: n.fila.get(r.flujoFilaId as string) ?? "",
    cuentaContableId: r.cuentaContableId,
    cuentaContable: r.cuentaContableId ? (n.cuenta.get(r.cuentaContableId) ?? null) : null,
  }));
}
