import { auditarRechazoSensible } from "./execute-rechazo";
import { controlAgente } from "./agentes/control";
import { denegar, falla } from "./autorizacion";
import { ErrorCapacidad } from "./errores";
import { conAuditoriaAlFinal } from "./execute-auditoria-final";
import { ejecutarLecturaAuditada } from "./execute-lectura";
import { consumoEjecucion } from "./execute-medicion";
import { auditaConElHandler, auditarSiPlataforma, eventoDeEscritura } from "./execute-plataforma";
import { repeticion, tenantDe } from "./execute-util";
import { SALIDA_INVALIDA } from "./idempotencia";
import { obtenerCapacidad } from "./registry";
import type { Capacidad, Contexto, FinalizarConsumo, OpcionesEjecucion, Resultado } from "./types";

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
  // Plataforma no reserva idempotencia: la reserva guardaría su input y su salida (correos, datos
  // de otra empresa) en la empresa de la key durante 24 h (CAR-36).
  const clave =
    !dryRun && c.efecto !== "lectura" && ctx.conTenant && c.modulo !== "platform"
      ? opciones.idempotencyKey
      : undefined;
  const reserva = clave ? await ctx.idempotencia.reservar(c.id, clave, entrada.data) : null;
  if (reserva && reserva.estado !== "nueva") {
    const resultado = repeticion(reserva);
    if (resultado.ok) await c.autorizarRepeticion?.(ctx, entrada.data, resultado.data);
    return { resultado, entrada: entrada.data };
  }
  const reservaId = reserva?.id;
  // La escritura audita en SU MISMA transacción, más abajo (ADR-052): si el insert de auditoría
  // falla, el handler hace rollback; si el handler falla, nunca se audita. Las `platform.*` sin
  // objetivo también, aun sin empresa (la auditoría de plataforma no depende del tenant, CAR-36).
  // Con `tenantObjetivo`, `executeCapability` audita aparte con `auditarSiPlataforma`.
  const auditaAqui = auditaConElHandler(ctx, c, dryRun);
  let crudo: unknown;
  let lecturaValidada: ReturnType<Capacidad["output"]["safeParse"]> | undefined;
  try {
    // Lecturas con empresa: una sola transacción con el tenant fijado una vez (ADR-045). Sin empresa
    // (plataforma) no se envuelve: la RLS no devuelve filas para un handler que no consulta la base.
    if (c.auditarLectura && ctx.conTenant) {
      lecturaValidada = await ejecutarLecturaAuditada(ctx, c, entrada.data, modo);
    } else if (c.efecto === "lectura" && ctx.conTenant && ctx.enLectura) {
      crudo = await ctx.enLectura((db) =>
        c.handler({ ...ctx, db, transaccion: (fn) => fn(db) }, entrada.data, modo),
      );
    } else if (auditaAqui) {
      crudo = await ctx.transaccion(async (tx) => {
        const alFinal = conAuditoriaAlFinal(ctx, tx);
        const salidaCruda = await c.handler(alFinal.ctx, entrada.data, modo);
        // Último paso antes del COMMIT: con el lock de auditoría tomado no se pide nada al pool.
        // Lo `platform.*` va a la auditoría global (CAR-36), nunca a la cadena de la empresa.
        await alFinal.volcar(eventoDeEscritura(ctx, c, entrada.data, salidaCruda, opciones));
        return salidaCruda;
      });
    } else {
      crudo = await c.handler(ctx, entrada.data, modo);
    }
  } catch (error) {
    if (reservaId) await ctx.idempotencia.liberar(reservaId);
    await auditarRechazoSensible(ctx, c, error);
    throw error;
  }
  const salida = lecturaValidada ?? c.output.safeParse(crudo);
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
  let finalizar: FinalizarConsumo | undefined;
  const prepago = ctx.actor.tipo === "agent" && ctx.conTenant && Boolean(ctx.medidor.preparar);
  try {
    // Las llamadas de agentes se cobran antes de sus efectos, nunca con after(). El medidor
    // serializa chequeo + consumo + aviso por key dentro de la misma transacción.
    if (prepago)
      finalizar = await ctx.medidor.preparar!(consumoEjecucion(ctx, c, opciones, ctx.tenantId));
    r = await correr(ctx, c, input, opciones);
    await auditarSiPlataforma(ctx, c, r, opciones);
  } catch (error) {
    const code = error instanceof ErrorCapacidad ? error.code : "INTERNAL";
    const message = error instanceof Error ? error.message : "Error inesperado.";
    const detalles = error instanceof ErrorCapacidad ? error.detalles : undefined;
    r = { resultado: falla(code, message, detalles) };
  }

  const tenantId = tenantDe(ctx, c, r.entrada, r.salida);
  const estado = { ok: r.resultado.ok, duracionMs: Date.now() - inicio };
  if (finalizar) await finalizar(estado).catch(() => undefined);
  else if (tenantId && !prepago)
    await ctx.medidor
      .registrar({
        ...consumoEjecucion(ctx, c, opciones, tenantId),
        ...estado,
      })
      .catch(() => undefined);
  const nueva = r.resultado.ok && !r.resultado.dryRun && !r.resultado.repetida;
  if (nueva && c.efecto !== "lectura") ctx.despacharEventos();
  return r.resultado;
}
