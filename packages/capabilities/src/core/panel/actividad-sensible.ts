import { PERMISOS_CORE } from "@opai/domain";

import { PERMISO_COSTOS, ocultarCostos } from "../../cpq/campos-costo";
import type { Contexto } from "../../types";

const MONTOS = ["sueldoBase", "colacion", "movilizacion", "gratificacionMonto"] as const;
const OCULTO = "••••";

/**
 * Montos de sueldo en el input auditado de `core.estructuras.*`: sin el permiso de sueldos
 * sensibles se reemplazan (también los de los bonos), igual que en `ocultarMontos` (Brief 02 §9).
 * Costos y márgenes de `cpq.*` (lista central `CAMPOS_COSTO_CPQ`, en cualquier nivel, también en
 * las operaciones de `ajustar`): sin `cpq:costos.ver` se reemplazan (R59). El historial (panel,
 * `core.audit.list` y su herramienta MCP) no puede ser una vía lateral para ver sueldos ni costos.
 */
export function redactarSensibles(
  ctx: Contexto,
  capability: string,
  entrada: Record<string, unknown>,
): Record<string, unknown> {
  if (capability.startsWith("cpq."))
    return ctx.autorizar(PERMISO_COSTOS) ? entrada : ocultarCostos(entrada);
  if (!capability.startsWith("core.estructuras.")) return entrada;
  if (ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)) return entrada;
  const copia: Record<string, unknown> = { ...entrada };
  for (const k of MONTOS) if (copia[k] != null) copia[k] = OCULTO;
  if (Array.isArray(copia["items"]))
    copia["items"] = copia["items"].map((i: unknown) =>
      i && typeof i === "object" ? { ...i, monto: OCULTO, porcentaje: OCULTO } : i,
    );
  return copia;
}

/** El historial también revela remuneraciones: no puede eludir la trazabilidad de t479u. */
export async function auditarHistorialSensible(
  ctx: Contexto,
  filas: readonly { id: string; capability: string; entityId: string | null }[],
  origen: "core.actividad.list" | "core.audit.list",
): Promise<void> {
  if (!ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)) return;
  for (const f of filas.filter(
    (f) =>
      f.capability.startsWith("core.estructuras.") &&
      f.capability !== "core.estructuras.read_sensible",
  )) {
    await ctx.transaccion((tx) =>
      ctx.auditoria.registrar(tx, {
        tenantId: ctx.tenantId,
        actor: ctx.actor,
        capability: "core.estructuras.read_sensible",
        entityType: "audit_event",
        entityId: f.id,
        payload: { origen, entidadId: f.entityId },
      }),
    );
  }
}
