import { falla } from "./autorizacion";
import { ErrorCapacidad } from "./errores";
import type { Capacidad, Contexto, Resultado } from "./types";

/**
 * Código categórico del error de base de datos (`P2024`, `P2034`, `08006`, `57P01`…), sin mensaje ni
 * valores: lo mínimo para distinguir un pool agotado, un conflicto de escritura o una conexión cortada.
 * Prisma lo deja en `code`; el adaptador de pg lo deja en `cause.originalCode` o `cause.kind`.
 */
export function codigoDeBase(error: unknown): string | null {
  const codigo = /^[A-Za-z0-9_]{3,40}$/;
  const candidatos: unknown[] = [];
  for (let e: unknown = error, i = 0; e && typeof e === "object" && i < 4; i += 1) {
    const o = e as { code?: unknown; originalCode?: unknown; kind?: unknown; cause?: unknown };
    candidatos.push(o.code, o.originalCode, o.kind);
    e = o.cause;
  }
  const hallado = candidatos.find((c) => typeof c === "string" && codigo.test(c));
  return typeof hallado === "string" ? hallado : null;
}

/**
 * Motivo ya saneado que un error declara seguro de registrar (`motivoSeguro`, CAR-242): el de un proveedor SII o un
 * `ErrorConMotivo`. Busca en la cadena de causas. Nunca se usa `error.message`, que puede traer Prisma o el input.
 */
export function motivoSeguroDe(error: unknown): string | null {
  for (let e: unknown = error, i = 0; e && typeof e === "object" && i < 4; i += 1) {
    const m = (e as { motivoSeguro?: unknown }).motivoSeguro;
    if (typeof m === "string" && m.trim()) return m.trim().slice(0, 200);
    e = (e as { cause?: unknown }).cause;
  }
  return null;
}

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
    codigoBase: codigoDeBase(error),
    motivo: motivoSeguroDe(error),
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
