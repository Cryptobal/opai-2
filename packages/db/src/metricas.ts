/**
 * Contador de consultas a Neon por request (ADR-045, Brief 03).
 *
 * `@opai/db` no conoce el ciclo de vida del request (eso vive en `apps/web`), así que no cuenta por
 * su cuenta: solo avisa, por cada operación de modelo Prisma, a un observador que el borde registra.
 * Fuera de un request (seeds, scripts, tests, crons sin observador) `notificarConsulta` es un no-op.
 *
 * Se cuenta una vez por operación de modelo (una «consulta» lógica). El `set_config` que fijan
 * `forTenant`/`forUser`/`enTransaccion` es `$executeRaw` y no pasa por el hook de `$allModels`, así que
 * no infla la cuenta. El append SQL de auditoría notifica explícitamente su única sentencia;
 * no pasa por el hook de modelos. Los raw de infraestructura siguen fuera del contador.
 */
type Observador = () => void;

let observador: Observador | null = null;

/** El borde (apps/web) registra el observador una vez; `null` lo quita (tests). */
export function registrarObservadorConsultas(fn: Observador | null): void {
  observador = fn;
}

/** La extensión de conteo de `clienteApp()` la llama por cada operación de modelo. */
export function notificarConsulta(): void {
  if (!observador) return;
  try {
    observador();
  } catch {
    // Contar jamás puede romper una consulta: si el observador falla (p. ej. fuera de un request
    // donde `cache()` no tiene contexto), se ignora.
  }
}
