import { auditarEnPlataforma, hechoPlataforma } from "./agentes/plataforma";
import type { EventoPropio } from "./execute-auditoria-final";
import { eventoAuditoria, sinSensibles } from "./execute-util";
import type { Capacidad, Contexto, OpcionesEjecucion, Resultado } from "./types";

// Auditoría de las capacidades `platform.*` en la auditoría global (CAR-36, CAR-40, CAR-41): las
// escrituras, sus antes/después y las lecturas. Las usa `executeCapability`.

/**
 * Auditoría de una escritura de plataforma con `tenantObjetivo` (CAR-36): va a la auditoría de
 * plataforma y, si el objetivo se resolvió, también a la cadena de ESA empresa (es su cambio), las
 * dos en una transacción propia del objetivo (no atómica con el handler, que escribe con
 * `ctx.plataforma.empresa(id)`, fuera de `ctx.transaccion`). Nunca en la empresa actual si no es el
 * objetivo. Las de plataforma sin objetivo las audita `correr`, atómicas con el handler.
 */
export async function auditarSiPlataforma(
  ctx: Contexto,
  c: Capacidad,
  r: { resultado: Resultado; entrada?: unknown; salida?: unknown },
  opciones: OpcionesEjecucion,
): Promise<void> {
  if (c.modulo === "platform" && c.efecto === "lectura") return auditarLecturaPlataforma(ctx, c, r);
  if (!c.tenantObjetivo || !ctx.plataforma || c.efecto === "lectura") return;
  const escrituraNueva = r.resultado.ok && !r.resultado.dryRun && !r.resultado.repetida;
  if (!escrituraNueva || r.entrada === undefined) return;
  const objetivo = c.tenantObjetivo(r.entrada, r.salida) ?? null;
  const evento = eventoAuditoria(c, ctx.actor, objetivo ?? "", r.entrada, r.salida, opciones);
  const cambio = cambioDe(c, r.entrada, r.salida);
  const hecho = hechoPlataforma(ctx, { ...evento, ...cambio, tenantObjetivoId: objetivo });
  if (!objetivo) return auditarEnPlataforma(ctx, hecho);
  await ctx.plataforma.auditarEnObjetivo(objetivo, hecho, { ...evento, tenantId: objetivo });
}

/**
 * Toda lectura `platform.*` que reveló datos queda en la auditoría global (CAR-40), con su input y
 * la empresa objetivo, sin la salida. Falla cerrado: si no se puede auditar, la llamada falla.
 */
async function auditarLecturaPlataforma(
  ctx: Contexto,
  c: Capacidad,
  r: { resultado: Resultado; entrada?: unknown; salida?: unknown },
) {
  if (!ctx.plataforma || !r.resultado.ok || r.entrada === undefined) return;
  const hecho = hechoPlataforma(ctx, {
    capability: c.id,
    tenantObjetivoId: c.tenantObjetivo?.(r.entrada, r.salida) ?? null,
    payload: { lectura: true, input: sinSensibles(r.entrada, c.sensibles) },
  });
  await auditarEnPlataforma(ctx, hecho);
}

/** Antes y después de un cambio global (CAR-41), si la capacidad los declara. */
function cambioDe(c: Capacidad, entrada: unknown, salida: unknown) {
  if (!c.cambio || salida === undefined) return {};
  const parsed = c.output.safeParse(salida);
  return parsed.success ? c.cambio(parsed.data, entrada) : {};
}

/** Escritura que audita en la misma transacción que su handler (ver `correr`, ADR-052). */
export const auditaConElHandler = (ctx: Contexto, c: Capacidad, dryRun: boolean) =>
  c.efecto !== "lectura" &&
  (ctx.conTenant || c.modulo === "platform") &&
  !c.tenantObjetivo &&
  !dryRun;

/**
 * Evento propio de una escritura auditada con su handler (ADR-052): las `platform.*` van a la
 * auditoría global (con antes/después si los declaran), nunca a la cadena de la empresa de la key
 * o de la sesión; el resto, a la de la empresa.
 */
export function eventoDeEscritura(
  ctx: Contexto,
  c: Capacidad,
  entrada: unknown,
  salida: unknown,
  opciones: OpcionesEjecucion,
): EventoPropio {
  const evento = eventoAuditoria(c, ctx.actor, ctx.tenantId, entrada, salida, opciones);
  return c.modulo === "platform"
    ? { global: hechoPlataforma(ctx, { ...evento, ...cambioDe(c, entrada, salida) }) }
    : { empresa: evento };
}
