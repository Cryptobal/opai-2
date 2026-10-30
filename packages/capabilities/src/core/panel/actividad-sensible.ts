import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";

const MONTOS = ["sueldoBase", "colacion", "movilizacion", "gratificacionMonto"] as const;
const OCULTO = "••••";
/** Campos de costo de CPQ (R59): en el input de `cpq.*` y en cada `operaciones[]` de ajustar. */
const COSTOS_CPQ = [
  "margenObjetivo",
  "modoMargen",
  "sueldoBruto",
  "costoUnitario",
  "margenPropio",
] as const;
const PERMISO_COSTOS_CPQ = "cpq:costos.ver";

function sinCostosCpq(o: Record<string, unknown>): Record<string, unknown> {
  const copia: Record<string, unknown> = { ...o };
  for (const k of COSTOS_CPQ) if (copia[k] != null) copia[k] = OCULTO;
  return copia;
}

/**
 * Costos del input auditado de `cpq.*` (R59): sin `cpq:costos.ver` se reemplazan, también dentro
 * del lote de `cpq.cotizaciones.ajustar`. El historial no puede ser una vía lateral para ver costos.
 */
function redactarCostosCpq(ctx: Contexto, entrada: Record<string, unknown>) {
  if (ctx.autorizar(PERMISO_COSTOS_CPQ)) return entrada;
  const copia = sinCostosCpq(entrada);
  if (Array.isArray(copia["operaciones"]))
    copia["operaciones"] = copia["operaciones"].map((o: unknown) =>
      o && typeof o === "object" ? sinCostosCpq({ ...o }) : o,
    );
  return copia;
}

/**
 * Montos de sueldo en el input auditado de `core.estructuras.*`: sin el permiso de sueldos
 * sensibles se reemplazan (también los de los bonos), igual que en `ocultarMontos` (Brief 02 §9).
 * El historial no puede ser una vía lateral para ver sueldos.
 */
export function redactarSensibles(
  ctx: Contexto,
  capability: string,
  entrada: Record<string, unknown>,
): Record<string, unknown> {
  if (capability.startsWith("cpq.")) return redactarCostosCpq(ctx, entrada);
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
