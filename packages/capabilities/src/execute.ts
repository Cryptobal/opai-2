import { ErrorCapacidad } from "./errores";
import { obtenerCapacidad } from "./registry";
import type { Capacidad, Contexto, OpcionesEjecucion, Resultado } from "./types";

const SIEMPRE_ACTIVOS = new Set(["core", "platform"]);

type Error = Extract<Resultado, { ok: false }>;
const falla = (code: Error["error"]["code"], message: string): Error => ({
  ok: false,
  error: { code, message },
});

/** Reglas previas al handler: tenant, módulo activo, scopes del agente y permiso. */
function denegar(ctx: Contexto, c: Capacidad): Error | null {
  if (!ctx.conTenant && !c.sinTenant) {
    return falla("FORBIDDEN", "Elige una empresa antes de usar esta capacidad.");
  }
  if (!SIEMPRE_ACTIVOS.has(c.modulo) && !ctx.modulosActivos.includes(c.modulo)) {
    return falla("FORBIDDEN", `Módulo inactivo: "${c.modulo}".`);
  }
  // Agentes: el módulo debe estar en los scopes. "*" cubre todo salvo plataforma.
  if (ctx.scopes && !ctx.scopes.includes(c.modulo)) {
    if (!ctx.scopes.includes("*") || c.modulo === "platform") {
      return falla("FORBIDDEN", `La API key no tiene el scope "${c.modulo}".`);
    }
  }
  if (c.permiso === null) {
    const sistemaEnProduccion =
      ctx.actor.tipo === "system" && process.env.NODE_ENV === "production";
    return sistemaEnProduccion && !c.interna ? falla("UNAUTHENTICATED", "Requiere sesión.") : null;
  }
  return ctx.autorizar(c.permiso) ? null : falla("FORBIDDEN", "Sin permiso para esta capacidad.");
}

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
    // La telemetría nunca rompe una ejecución.
    await ctx.telemetria
      .registrar({
        tenantId,
        userId: ctx.usuario?.id ?? null,
        actorType: ctx.actor.tipo,
        portal: ctx.portal,
        modulo: c.modulo,
        capability: c.id,
        efecto: c.efecto,
        dryRun: opciones.dryRun === true,
        ok: r.resultado.ok,
        duracionMs: Date.now() - inicio,
      })
      .catch(() => undefined);
  }
  return r.resultado;
}
