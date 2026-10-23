import { falla } from "./autorizacion";
import { type ReservaIdempotencia, SALIDA_INVALIDA } from "./idempotencia";
import type { Capacidad, Contexto, Resultado } from "./types";

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
