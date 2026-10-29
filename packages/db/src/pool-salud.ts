import type pg from "pg";

/**
 * Salud de las conexiones del pool. En Vercel (Fluid compute) la instancia se suspende entre
 * requests; al reanudarse, Neon pudo cortar las conexiones ociosas («server conn crashed?»,
 * «Connection terminated unexpectedly») y los temporizadores de pg pueden dispararse de inmediato,
 * porque el reloj del event loop quedó en la hora de antes de la suspensión. Por eso se mide con
 * `Date.now()`, que sí refleja el tiempo real transcurrido.
 */

/** Conexiones que emitieron 'error' (socket caído): nunca se vuelven a entregar. */
const conError = new WeakSet<pg.Client>();
/** Momento (reloj de pared) en que cada conexión volvió al pool. */
const devueltaEn = new WeakMap<pg.Client, number>();

export function marcarConError(cliente: pg.Client): void {
  conError.add(cliente);
}

export function marcarDevuelta(cliente: pg.Client, ahora = Date.now()): void {
  devueltaEn.set(cliente, ahora);
}

/**
 * Una conexión ociosa no se reutiliza si emitió 'error', si su socket ya está cerrado o si estuvo
 * en el pool más que `inactividadMs`: el pool la habría cerrado, así que la instancia estuvo
 * suspendida y Neon pudo cortarla sin que el aviso llegara todavía. Descartarla no envía consultas.
 */
export function conexionMuerta(cliente: pg.Client, inactividadMs: number, ahora = Date.now()) {
  if (conError.has(cliente)) return true;
  const socket = cliente.connection?.stream;
  if (socket && (socket.destroyed || !socket.writable)) return true;
  const desde = devueltaEn.get(cliente);
  return inactividadMs > 0 && desde !== undefined && ahora - desde > inactividadMs;
}

/** Mensajes de pg-pool al vencer `connectionTimeoutMillis`. */
const VENCIMIENTO = /due to connection timeout|timeout expired|timeout exceeded/i;

/** Si el error es un vencimiento de `connectionTimeoutMillis` (adelantado o real). */
export function esVencimiento(e: unknown): boolean {
  return e instanceof Error && VENCIMIENTO.test(e.message);
}

/**
 * Fallos al ABRIR o al esperar una conexión (antes de enviar consulta alguna), que se pueden
 * reintentar sin riesgo de repetir una escritura:
 * - el pooler de Neon cortando el arranque, un socket TLS que se cae, la autenticación que vence
 *   mientras la compute despierta;
 * - un vencimiento de `connectionTimeoutMillis` («due to connection timeout», «timeout exceeded
 *   when trying to connect») que llegó ANTES de la mitad del tope por reloj de pared: es el
 *   temporizador adelantado tras reanudar la instancia, no una espera real. Un vencimiento real ya
 *   esperó el tope completo y no se reintenta (duplicaría la espera).
 * Nunca credenciales inválidas ni otros errores.
 */
export function esFalloDeConexion(e: unknown, transcurridoMs?: number, topeMs?: number): boolean {
  if (!(e instanceof Error)) return false;
  if (esVencimiento(e)) {
    return transcurridoMs !== undefined && !!topeMs && transcurridoMs < topeMs / 2;
  }
  const codigo = "code" in e ? String(e.code) : "";
  if (["ECONNRESET", "ECONNREFUSED", "EPIPE", "EAI_AGAIN"].includes(codigo)) return true;
  return /Connection terminated|Authentication timed out|before secure TLS/i.test(e.message);
}

/** Aviso categórico (sin URL, usuario ni consulta) de una conexión que el pool descartó. */
export function avisarDescarte(e: unknown): void {
  const codigo = e instanceof Error && "code" in e ? String(e.code) : "sin código";
  console.warn(`pool pg: conexión ociosa descartada por error (${codigo}).`);
}

/** Aviso categórico (sin URL, usuario ni consulta) de un reintento al obtener conexión. */
export function avisarReintento(e: unknown, n: number): void {
  console.warn(
    esVencimiento(e)
      ? `pool pg: reintento tras vencimiento adelantado (${n})`
      : `pool pg: reintento tras fallo de conexión (${n})`,
  );
}
