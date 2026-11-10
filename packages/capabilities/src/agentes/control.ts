import { frasePedido, jsonCanonico, resumenGenerico } from "@opai/domain";

import { falla } from "../autorizacion";
import { sinSensibles } from "../execute-util";
import type { Capacidad, Contexto, OpcionesEjecucion, Resultado } from "../types";
import { aprobacionDePlataforma } from "./control-plataforma";

/** Una aprobación pendiente vence a las 72 horas (ADR-032). */
export const VIGENCIA_APROBACION_MS = 72 * 3_600_000;

/** Texto humano de la solicitud (CAR-250): «Grok pide emitir la factura 33, $ 11.900». Nunca falla. */
async function resumir(
  ctx: Contexto,
  c: Capacidad,
  entrada: unknown,
  agente: string,
): Promise<string> {
  try {
    const accion = c.describirAprobacion
      ? await c.describirAprobacion(ctx, c.input.parse(entrada))
      : null;
    if (accion) return frasePedido(agente, accion);
  } catch {
    // Sin el texto propio de la capacidad, vale el genérico.
  }
  return resumenGenerico(agente, c.id, c.descripcion);
}

/** Lo irreversible sin autonomía "directo" no se ejecuta: queda en la cola de aprobaciones. */
async function aprobacion(
  ctx: Contexto,
  c: Capacidad,
  entrada: unknown,
  opciones: OpcionesEjecucion,
): Promise<Resultado | null> {
  const interno = ctx.actor.tipo === "agent" && ctx.actor.interno ? ctx.actor.id : null;
  const a =
    ctx.agente ??
    (interno
      ? { apiKeyId: null, nombre: "Agente interno", autonomia: {} as Record<string, string> }
      : null);
  const nivel = a?.autonomia[c.id];
  // `exigeAprobacion` (R19) condiciona la aprobación al input y reemplaza al efecto como disparador;
  // sin él, manda el efecto irreversible como siempre. La autonomía "aprobacion"/"directo" gana.
  const porInput = c.exigeAprobacion
    ? c.exigeAprobacion(entrada)
    : c.efecto === "irreversible";
  const exige = nivel === "aprobacion" || (porInput && nivel !== "directo");
  if (!a || !exige) return null;
  if (ctx.actor.tipo !== "agent") return null;
  const venceEn = new Date(Date.now() + VIGENCIA_APROBACION_MS);
  const resumen = await resumir(ctx, c, entrada, a.nombre);
  // Lo `platform.*` va a la cola de plataforma, nunca a la de la empresa de la key (CAR-36).
  if (c.modulo === "platform")
    return aprobacionDePlataforma(ctx, c, entrada, opciones, a, { resumen, venceEn }, requerida);
  const repetida = opciones.idempotencyKey
    ? await ctx.db.aprobacion.findFirst({
        where: {
          apiKeyId: a.apiKeyId,
          ...(interno ? { agenteInternoId: interno, viaUserId: ctx.actor.viaUserId } : {}),
          capability: c.id,
          idempotencyKey: opciones.idempotencyKey,
        },
      })
    : null;
  if (repetida) {
    // Misma clave con otro input: conflicto. Si la anterior venció, se pide de nuevo.
    if (jsonCanonico(repetida.input) !== jsonCanonico(JSON.parse(JSON.stringify(entrada ?? {})))) {
      return falla("CONFLICT", "La clave de idempotencia ya se usó con otro input.");
    }
    if (repetida.estado !== "vencida") return requerida(repetida.id);
  }
  // Aprobación, evento y auditoría en una sola transacción (ADR-052): dejar pendiente una
  // escritura irreversible también es una escritura, y se audita atómica con ella.
  const id = await ctx.transaccion(async (tx) => {
    const fila = await tx.aprobacion.create({
      data: {
        tenantId: ctx.tenantId,
        apiKeyId: a.apiKeyId,
        agenteInternoId: interno,
        viaUserId: ctx.actor.viaUserId ?? "",
        capability: c.id,
        input: JSON.parse(JSON.stringify(entrada ?? {})),
        idempotencyKey: opciones.idempotencyKey ?? null,
        resumen,
        venceEn,
        estado: "pendiente",
      },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "core.aprobacion.pendiente",
      entidadTipo: "aprobacion",
      entidadId: fila.id,
      payload: { agente: a.nombre, capability: c.id, resumen, venceEn: venceEn.toISOString() },
    });
    await ctx.auditoria.registrar(tx, {
      tenantId: ctx.tenantId,
      capability: c.id,
      actor: ctx.actor,
      entityType: "aprobacion",
      entityId: fila.id,
      payload: {
        intento: "APPROVAL_REQUIRED",
        aprobacionId: fila.id,
        input: sinSensibles(entrada, c.sensibles),
      },
    });
    return fila.id;
  });
  ctx.despacharEventos();
  return requerida(id);
}

const requerida = (aprobacionId: string): Resultado => ({
  ok: false,
  error: {
    code: "APPROVAL_REQUIRED",
    message:
      "Acción irreversible: quedó pendiente de aprobación humana (vence en 72 h). Consulta su estado con core.aprobaciones.get.",
    aprobacionId,
  },
});

/** Reglas de agentes (ADR-032) antes de ejecutar: presupuesto y aprobación humana. */
export async function controlAgente(
  ctx: Contexto,
  c: Capacidad,
  entrada: unknown,
  opciones: OpcionesEjecucion,
) {
  if (ctx.actor.tipo !== "agent" || (!ctx.agente && !ctx.actor.interno) || opciones.dryRun)
    return null;
  // El presupuesto se consume atómicamente en el medidor ANTES del handler (execute.ts).
  return aprobacion(ctx, c, entrada, opciones);
}
