import { falla } from "./autorizacion";
import { type ReservaIdempotencia, SALIDA_INVALIDA } from "./idempotencia";
import type {
  Actor,
  Capacidad,
  Contexto,
  EventoAuditoria,
  OpcionesEjecucion,
  Resultado,
} from "./types";

/** Respuesta a una clave de idempotencia ya usada: el resultado original o un conflicto. */
export function repeticion(r: Exclude<ReservaIdempotencia, { estado: "nueva" }>): Resultado {
  if (r.estado === "hecha") {
    const invalida =
      !!r.resultado && typeof r.resultado === "object" && SALIDA_INVALIDA in r.resultado;
    if (invalida)
      return falla("INVALID_OUTPUT", "La escritura se hizo, pero su resultado no validó.");
    return { ok: true, data: r.resultado, dryRun: false, repetida: true };
  }
  return falla(
    "CONFLICT",
    r.estado === "en_curso"
      ? "Una ejecución con esta clave de idempotencia sigue en curso."
      : "La clave de idempotencia ya se usó con otra capacidad u otro input.",
  );
}

/** Copia del input sin los campos sensibles (secretos): nunca llegan a la auditoría. */
export function sinSensibles(entrada: unknown, sensibles: readonly string[] = []): unknown {
  if (!sensibles.length || !entrada || typeof entrada !== "object") return entrada;
  const copia: Record<string, unknown> = { ...(entrada as Record<string, unknown>) };
  for (const k of sensibles) if (k in copia) copia[k] = "[oculto]";
  return copia;
}

/** Tenant donde auditar y medir: el objetivo (plataforma) o el actual; null si no hay ninguno. */
export function tenantDe(
  ctx: Contexto,
  c: Capacidad,
  entrada: unknown,
  salida: unknown,
): string | null {
  const objetivo = entrada !== undefined ? c.tenantObjetivo?.(entrada, salida) : undefined;
  return objetivo ?? (ctx.conTenant ? ctx.tenantId : null);
}

const SINGULAR: Record<string, string> = {
  cuentas: "cuenta",
  contactos: "contacto",
  instalaciones: "instalacion",
  puestos: "puesto",
  personas: "persona",
  vinculos: "vinculo",
  cargos: "cargo",
  estructuras: "estructura",
  documentos: "documento",
  apikeys: "api_key",
  users: "usuario",
  aprobaciones: "aprobacion",
};

const idDe = (v: unknown): string | null =>
  v && typeof v === "object" && "id" in v && typeof v.id === "string" && v.id ? v.id : null;

/**
 * Entidad afectada por una escritura, para la actividad de cada ficha: la entidad del id de la
 * capacidad (`core.cuentas.update` → cuenta) con el id de la salida o de la entrada.
 */
export function entidadAuditada(
  capacidad: string,
  entrada: unknown,
  salida: unknown,
): { entityType?: string; entityId?: string } {
  const tipo = SINGULAR[capacidad.split(".")[1] ?? ""];
  const id = idDe(salida) ?? idDe(entrada);
  return tipo && id ? { entityType: tipo, entityId: id } : {};
}

/** Evento de auditoría completo (ADR-052): lo arma `executeCapability` para los dos caminos. */
export function eventoAuditoria(
  ctx: Contexto,
  c: Capacidad,
  tenantId: string,
  entrada: unknown,
  salida: unknown,
  opciones: OpcionesEjecucion,
): EventoAuditoria {
  const parsed = salida !== undefined ? c.output.safeParse(salida) : null;
  const extra =
    parsed?.success && c.auditoriaPayload
      ? c.auditoriaPayload(ctx, entrada as never, parsed.data as never)
      : {};
  return {
    tenantId,
    capability: c.id,
    actor: ctx.actor,
    ...entidadAuditada(c.id, entrada, salida),
    payload: {
      input: sinSensibles(entrada, c.sensibles),
      idempotencyKey: opciones.idempotencyKey ?? null,
      ...opciones.auditoriaExtra,
      ...extra,
    },
  };
}

/** Fila de `core.consumos` de la propia ejecución (ADR-031): nunca rompe, mide igual si falló. */
export function consumoDeEjecucion(
  ctx: Contexto,
  c: Capacidad,
  tenantId: string,
  opciones: OpcionesEjecucion,
  ok: boolean,
  duracionMs: number,
) {
  return {
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
    ok,
    duracionMs,
  };
}
