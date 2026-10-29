import { falla } from "./autorizacion";
import { ErrorCapacidad } from "./errores";
import type { Capacidad, Contexto, Resultado } from "./types";

/**
 * Log estructurado de un error inesperado (INTERNAL, CAR-49): solo lo necesario para ubicarlo con
 * la correlación que recibe el usuario o el agente. Nunca el input ni el payload del handler.
 */
function registrarErrorInesperado(
  ctx: Contexto,
  c: Capacidad,
  error: unknown,
  correlacion: string,
): void {
  console.error("[capacidad] error_interno", {
    evento: "capacidad.error_interno",
    capacidad: c.id,
    tenantId: ctx.conTenant ? ctx.tenantId : null,
    code: "INTERNAL",
    errorName: error instanceof Error ? error.name : typeof error,
    correlacion,
  });
}

/**
 * Mapea una excepción al resultado que ve la UI, la API o el MCP: un `ErrorCapacidad` conserva su
 * código y mensaje de negocio; cualquier otra excepción se sanea a un mensaje genérico con una
 * correlación (nunca el esquema o los valores crudos de Prisma o pg, en inglés, CAR-49).
 */
export function resultadoDeError(ctx: Contexto, c: Capacidad, error: unknown): Resultado {
  if (error instanceof ErrorCapacidad) return falla(error.code, error.message, error.detalles);
  const correlacion = crypto.randomUUID();
  registrarErrorInesperado(ctx, c, error, correlacion);
  return falla(
    "INTERNAL",
    `Ocurrió un error inesperado. Reintenta en unos minutos. (ref: ${correlacion})`,
  );
}
