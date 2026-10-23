import { controlAgente } from "./agentes/control";
import { denegar, falla } from "./autorizacion";
import { ErrorCapacidad } from "./errores";
import { repeticion, sinSensibles, tenantDe } from "./execute-util";
import { SALIDA_INVALIDA } from "./idempotencia";
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
  const bloqueo = await controlAgente(ctx, c, entrada.data, opciones);
  if (bloqueo) return { resultado: bloqueo, entrada: entrada.data };
  const clave =
    !dryRun && c.efecto !== "lectura" && ctx.conTenant ? opciones.idempotencyKey : undefined;
  const reserva = clave ? await ctx.idempotencia.reservar(c.id, clave, entrada.data) : null;
  if (reserva && reserva.estado !== "nueva") {
    return { resultado: repeticion(reserva), entrada: entrada.data };
  }
  const reservaId = reserva?.id;
  let crudo: unknown;
  try {
    crudo = await c.handler(ctx, entrada.data, modo);
  } catch (error) {
    if (reservaId) await ctx.idempotencia.liberar(reservaId);
    throw error;
  }
  const salida = c.output.safeParse(crudo);
  if (reservaId) {
    // El handler terminó: la escritura ya ocurrió. Nunca se libera la clave (duplicaría).
    await ctx.idempotencia.completar(
      reservaId,
      salida.success ? salida.data : { [SALIDA_INVALIDA]: true },
    );
  }

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
    const escrituraNueva = r.resultado.ok && !r.resultado.dryRun && !r.resultado.repetida;
    if (escrituraNueva && c.efecto !== "lectura" && tenantId) {
      await ctx.auditoria.registrar({
        tenantId,
        capability: c.id,
        actor: ctx.actor,
        payload: {
          input: sinSensibles(r.entrada, c.sensibles),
          idempotencyKey: opciones.idempotencyKey ?? null,
          ...opciones.auditoriaExtra,
        },
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
  const nueva = r.resultado.ok && !r.resultado.dryRun && !r.resultado.repetida;
  if (nueva && c.efecto !== "lectura") ctx.despacharEventos();
  return r.resultado;
}
