import { falla } from "../autorizacion";
import { sinSensibles } from "../execute-util";
import type { Capacidad, Contexto, OpcionesEjecucion, Resultado } from "../types";

/** Una aprobación pendiente vence a las 72 horas (ADR-032). */
export const VIGENCIA_APROBACION_MS = 72 * 3_600_000;

const inicioDeMes = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const usd = (micro: number | bigint) => (Number(micro) / 1_000_000).toFixed(2).replace(".", ",");

async function emitirUnaVezAlMes(
  ctx: Contexto,
  tipo: string,
  apiKeyId: string,
  payload: Record<string, unknown>,
) {
  const ya = await ctx.db.evento.count({
    where: { tipo, entidadId: apiKeyId, createdAt: { gte: inicioDeMes() } },
  });
  if (ya) return;
  await ctx.transaccion((tx) =>
    ctx.eventos.emitir(tx, { tipo, entidadTipo: "api_key", entidadId: apiKeyId, payload }),
  );
}

/** Corta al agente que agotó su presupuesto del mes y avisa al 80 % y al 100 % (una vez al mes). */
async function presupuesto(ctx: Contexto): Promise<Resultado | null> {
  const a = ctx.agente;
  if (!a?.presupuestoMensualMicro) return null;
  const grupos = await ctx.db.consumo.groupBy({
    by: ["apiKeyId"],
    where: { apiKeyId: a.apiKeyId, createdAt: { gte: inicioDeMes() } },
    _sum: { costoTotalMicro: true },
  });
  const gastado = BigInt(grupos[0]?._sum.costoTotalMicro ?? 0);
  const tope = a.presupuestoMensualMicro;
  const payload = { agente: a.nombre, consumoUsd: usd(gastado), presupuestoUsd: usd(tope) };
  if (gastado >= tope) {
    await emitirUnaVezAlMes(ctx, "core.agente.presupuesto_100", a.apiKeyId, payload);
    return falla(
      "BUDGET_EXCEEDED",
      `El agente agotó su presupuesto del mes (US$ ${payload.presupuestoUsd}). Pide a un administrador que lo amplíe.`,
    );
  }
  if (gastado * 10n >= tope * 8n)
    await emitirUnaVezAlMes(ctx, "core.agente.presupuesto_80", a.apiKeyId, payload);
  return null;
}

function resumir(c: Capacidad, entrada: unknown): string {
  const texto = JSON.stringify(sinSensibles(entrada, c.sensibles));
  return `${c.id} ${texto.length > 240 ? `${texto.slice(0, 237)}…` : texto}`;
}

/** Lo irreversible sin autonomía "directo" no se ejecuta: queda en la cola de aprobaciones. */
async function aprobacion(
  ctx: Contexto,
  c: Capacidad,
  entrada: unknown,
  opciones: OpcionesEjecucion,
): Promise<Resultado | null> {
  const a = ctx.agente;
  if (!a || c.efecto !== "irreversible" || a.autonomia[c.id] === "directo") return null;
  if (ctx.actor.tipo !== "agent") return null;
  const repetida = opciones.idempotencyKey
    ? await ctx.db.aprobacion.findFirst({
        where: { apiKeyId: a.apiKeyId, capability: c.id, idempotencyKey: opciones.idempotencyKey },
      })
    : null;
  if (repetida) return requerida(repetida.id);
  const venceEn = new Date(Date.now() + VIGENCIA_APROBACION_MS);
  const resumen = resumir(c, entrada);
  const id = await ctx.transaccion(async (tx) => {
    const fila = await tx.aprobacion.create({
      data: {
        tenantId: ctx.tenantId,
        apiKeyId: a.apiKeyId,
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
    return fila.id;
  });
  await ctx.auditoria.registrar({
    tenantId: ctx.tenantId,
    capability: c.id,
    actor: ctx.actor,
    payload: {
      intento: "APPROVAL_REQUIRED",
      aprobacionId: id,
      input: sinSensibles(entrada, c.sensibles),
    },
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
  if (ctx.actor.tipo !== "agent" || !ctx.agente || opciones.dryRun) return null;
  return (await presupuesto(ctx)) ?? (await aprobacion(ctx, c, entrada, opciones));
}
