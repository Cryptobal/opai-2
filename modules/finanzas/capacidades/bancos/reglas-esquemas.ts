import { z } from "zod";

import { reglaDeNegocio, type Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";
import { definicionDesdeJson, OPERADORES_POR_CAMPO, type ReglaEvaluable } from "@opai/domain";

/** Condición de una regla del banco (CAR-328): campo, operador válido para el campo y valor. */
export const condicionReglaSchema = z
  .object({
    campo: z.enum(["rut", "glosa", "monto", "referencia"]),
    operador: z.enum(["igual", "contiene", "empieza", "exacto", "entre"]),
    valor: z.string().trim().min(1).max(120),
    hasta: z.number().int().positive().max(2_000_000_000).optional(),
  })
  .refine((c) => OPERADORES_POR_CAMPO[c.campo].includes(c.operador), {
    message: "Ese operador no aplica a ese campo.",
  })
  .refine((c) => c.operador !== "entre" || c.hasta != null, { message: "«Entre» necesita el monto hasta." });

export const definicionReglaSchema = z.object({
  alcance: z.enum(["abonos", "cargos", "ambos"]),
  condiciones: z.array(condicionReglaSchema).min(1).max(8),
});

export const reglaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  prioridad: z.number().int(),
  modo: z.enum(["todas", "alguna"]),
  /** Alcance y condiciones; null si la regla tiene un formato anterior que ya no se evalúa. */
  definicion: definicionReglaSchema.nullable(),
  /** Condiciones guardadas tal cual (compatibilidad con clientes anteriores). */
  condiciones: z.record(z.string(), z.unknown()),
  activa: z.boolean(),
  flujoFilaId: z.string().nullable(),
  filaEtiqueta: z.string().nullable(),
  cuentaContableId: z.string().nullable(),
  cuentaContable: z.string().nullable(),
});

type FilaRegla = {
  id: string;
  nombre: string;
  prioridad: number;
  modo: string;
  condiciones: unknown;
  activa: boolean;
  flujoFilaId: string | null;
  cuentaContableId: string | null;
};

export type ReglaConDestino = ReglaEvaluable & { cuentaContableId: string | null };

export function reglaEvaluable(r: FilaRegla): ReglaConDestino | null {
  const def = definicionDesdeJson(r.condiciones);
  if (!def) return null;
  return {
    ...def,
    id: r.id,
    nombre: r.nombre,
    prioridad: r.prioridad,
    modo: r.modo === "alguna" ? "alguna" : "todas",
    activa: r.activa,
    flujoFilaId: r.flujoFilaId,
    cuentaContableId: r.cuentaContableId,
  };
}

/** Nombres de filas y cuentas contables para mostrar el destino sin exponer más que la etiqueta. */
export async function nombresDestino(ctx: Contexto, filaIds: string[], cuentaIds: string[]) {
  const [filas, cuentas] = await Promise.all([
    filaIds.length ? ctx.db.flujoFila.findMany({ where: { id: { in: filaIds } }, select: { id: true, etiqueta: true } }) : [],
    cuentaIds.length
      ? ctx.db.cuentaContable.findMany({ where: { id: { in: cuentaIds } }, select: { id: true, codigo: true, nombre: true } })
      : [],
  ]);
  return {
    fila: new Map(filas.map((f) => [f.id, f.etiqueta])),
    cuenta: new Map(cuentas.map((c) => [c.id, `${c.codigo} ${c.nombre}`])),
  };
}

export function reglaASalida(r: FilaRegla, n: Awaited<ReturnType<typeof nombresDestino>>): z.infer<typeof reglaSchema> {
  const def = definicionDesdeJson(r.condiciones);
  return {
    id: r.id,
    nombre: r.nombre,
    prioridad: r.prioridad,
    modo: r.modo === "alguna" ? "alguna" : "todas",
    definicion: def,
    condiciones: (r.condiciones ?? {}) as Record<string, unknown>,
    activa: r.activa,
    flujoFilaId: r.flujoFilaId,
    filaEtiqueta: r.flujoFilaId ? (n.fila.get(r.flujoFilaId) ?? null) : null,
    cuentaContableId: r.cuentaContableId,
    cuentaContable: r.cuentaContableId ? (n.cuenta.get(r.cuentaContableId) ?? null) : null,
  };
}

/**
 * Valida el destino: la fila existe y está activa, y su sección calza con el alcance (abonos → ingreso,
 * cargos → egreso). La cuenta contable, si viene, existe, está activa y acepta asientos.
 */
export async function validarDestino(
  db: Pick<TenantTx, "flujoFila" | "cuentaContable">,
  p: { flujoFilaId: string; cuentaContableId?: string | null | undefined; alcance?: "abonos" | "cargos" | "ambos"; signo?: number },
) {
  const fila = await db.flujoFila.findFirst({ where: { id: p.flujoFilaId, activa: true }, select: { seccion: true } });
  if (!fila) throw reglaDeNegocio("La fila del flujo no existe o está archivada.");
  const esperada =
    p.alcance === "abonos" || (p.signo ?? 0) > 0 ? "ingreso" : p.alcance === "cargos" || (p.signo ?? 0) < 0 ? "egreso" : null;
  if (esperada && fila.seccion !== esperada) {
    throw reglaDeNegocio(
      esperada === "ingreso" ? "Un abono va a una fila de ingresos del flujo." : "Un cargo va a una fila de egresos del flujo.",
    );
  }
  if (p.cuentaContableId) {
    const c = await db.cuentaContable.findFirst({
      where: { id: p.cuentaContableId, activa: true },
      select: { aceptaAsientos: true },
    });
    if (!c) throw reglaDeNegocio("La cuenta contable no existe o está inactiva.");
    if (!c.aceptaAsientos) throw reglaDeNegocio("Elige una cuenta de movimiento, no un título del plan de cuentas.");
  }
}
