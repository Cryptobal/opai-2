import { obtenerCapacidad } from "./registry";
import type { Contexto, OpcionesEjecucion, Resultado } from "./types";

/**
 * Ejecuta una capacidad: resuelve, valida el input, autoriza, ejecuta, valida el output y audita.
 * Toda ejecución real (no dryRun) con efecto distinto de lectura queda en `audit_events`.
 */
export async function executeCapability(
  ctx: Contexto,
  id: string,
  input: unknown,
  opciones: OpcionesEjecucion = {},
): Promise<Resultado> {
  const capacidad = obtenerCapacidad(id);
  if (!capacidad) {
    return { ok: false, error: { code: "NOT_FOUND", message: `Capacidad "${id}" no existe.` } };
  }

  const entrada = capacidad.input.safeParse(input ?? {});
  if (!entrada.success) {
    return {
      ok: false,
      error: { code: "INVALID_INPUT", message: "Input inválido.", issues: entrada.error.issues },
    };
  }

  if (capacidad.permiso !== null && !ctx.autorizar(capacidad.permiso)) {
    return { ok: false, error: { code: "FORBIDDEN", message: "Sin permiso para esta capacidad." } };
  }

  const dryRun = opciones.dryRun === true;
  if (dryRun && !capacidad.dryRun) {
    return {
      ok: false,
      error: { code: "DRY_RUN_NOT_SUPPORTED", message: "Esta capacidad no soporta vista previa." },
    };
  }

  const modo = opciones.idempotencyKey
    ? { dryRun, idempotencyKey: opciones.idempotencyKey }
    : { dryRun };

  try {
    const crudo = await capacidad.handler(ctx, entrada.data, modo);
    const salida = capacidad.output.safeParse(crudo);
    if (!salida.success) {
      return {
        ok: false,
        error: {
          code: "INVALID_OUTPUT",
          message: "El handler devolvió un resultado inválido.",
          issues: salida.error.issues,
        },
      };
    }
    if (capacidad.efecto !== "lectura" && !dryRun) {
      await ctx.auditoria.registrar({
        capability: capacidad.id,
        actor: ctx.actor,
        payload: { input: entrada.data, idempotencyKey: opciones.idempotencyKey ?? null },
      });
    }
    return { ok: true, data: salida.data, dryRun };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return { ok: false, error: { code: "INTERNAL", message } };
  }
}
