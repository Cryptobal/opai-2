import { denegar, falla } from "./autorizacion";
import { ErrorCapacidad } from "./errores";
import { obtenerCapacidad } from "./registry";
import type { Capacidad, Contexto, OpcionesEjecucion, Resultado } from "./types";

async function correr(
  ctx: Contexto,
  c: Capacidad,
  input: unknown,
  opciones: OpcionesEjecucion,
): Promise<{ resultado: Resultado; entrada?: unknown; salida?: unknown }> {
  const entrada = c.input.safeParse(input ?? {});
  if (!entrada.success) {
    const issues = entrada.error.issues;
    return {
      resultado: {
        ok: false,
        error: { code: "INVALID_INPUT", message: "Input inválido.", issues },
      },
    };
  }
  const negado = denegar(ctx, c);
  if (negado) return { resultado: negado, entrada: entrada.data };

  const dryRun = opciones.dryRun === true;
  if (dryRun && !c.dryRun) {
    return {
      resultado: falla("DRY_RUN_NOT_SUPPORTED", "Esta capacidad no soporta vista previa."),
      entrada: entrada.data,
    };
  }
  const modo = opciones.idempotencyKey
    ? { dryRun, idempotencyKey: opciones.idempotencyKey }
    : { dryRun };
  const crudo = await c.handler(ctx, entrada.data, modo);
  const salida = c.output.safeParse(crudo);
  if (!salida.success) {
    return {
      resultado: {
        ok: false,
        error: {
          code: "INVALID_OUTPUT",
          message: "El handler devolvió un resultado inválido.",
          issues: salida.error.issues,
        },
      },
      entrada: entrada.data,
    };
  }
  return {
    resultado: { ok: true, data: salida.data, dryRun },
    entrada: entrada.data,
    salida: salida.data,
  };
}

/** Tenant donde auditar y medir: el objetivo (plataforma) o el actual; null si no hay ninguno. */
function tenantDe(ctx: Contexto, c: Capacidad, entrada: unknown, salida: unknown): string | null {
  const objetivo = entrada !== undefined ? c.tenantObjetivo?.(entrada, salida) : undefined;
  return objetivo ?? (ctx.conTenant ? ctx.tenantId : null);
}

/**
 * Ejecuta una capacidad: resuelve, valida el input, autoriza (tenant, módulo, scopes, permiso),
 * ejecuta, valida el output, audita y mide. Toda ejecución real (no dryRun) con efecto distinto
 * de lectura queda en `audit_events`; toda ejecución queda en `usage_events`.
 */
export async function executeCapability(
  ctx: Contexto,
  id: string,
  input: unknown,
  opciones: OpcionesEjecucion = {},
): Promise<Resultado> {
  const c = obtenerCapacidad(id);
  if (!c) return falla("NOT_FOUND", `Capacidad "${id}" no existe.`);

  const inicio = Date.now();
  let r: Awaited<ReturnType<typeof correr>>;
  try {
    r = await correr(ctx, c, input, opciones);
    const tenantId = tenantDe(ctx, c, r.entrada, r.salida);
    if (r.resultado.ok && !r.resultado.dryRun && c.efecto !== "lectura" && tenantId) {
      await ctx.auditoria.registrar({
        tenantId,
        capability: c.id,
        actor: ctx.actor,
        payload: { input: r.entrada, idempotencyKey: opciones.idempotencyKey ?? null },
      });
    }
  } catch (error) {
    const code = error instanceof ErrorCapacidad ? error.code : "INTERNAL";
    const message = error instanceof Error ? error.message : "Error inesperado.";
    r = { resultado: falla(code, message) };
  }

  const tenantId = tenantDe(ctx, c, r.entrada, r.salida);
  if (tenantId) {
    // La medición nunca rompe una ejecución (ADR-031).
    const consumo = {
      tenantId,
      recurso: "capacidad.ejecucion",
      unidad: "llamada",
      cantidad: 1,
      modulo: c.modulo,
      capability: c.id,
      actorTipo: ctx.actor.tipo,
      actorId: ctx.actor.id ?? null,
      viaUserId: ctx.actor.viaUserId ?? null,
      apiKeyId: ctx.actor.tipo === "agent" ? ctx.actor.id : null,
      portal: ctx.portal,
      efecto: c.efecto,
      dryRun: opciones.dryRun === true,
      ok: r.resultado.ok,
      duracionMs: Date.now() - inicio,
    };
    await ctx.medidor.registrar(consumo).catch(() => undefined);
  }
  if (r.resultado.ok && !r.resultado.dryRun && c.efecto !== "lectura") ctx.despacharEventos();
  return r.resultado;
}
