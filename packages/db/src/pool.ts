import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

import { ClienteSerial } from "./cliente-serial";

type Liberar = (release?: unknown) => void;
type AlConectar = (
  err: Error | undefined,
  client: pg.PoolClient | undefined,
  done: Liberar,
) => void;

const PAUSA_REINTENTO_MS = 300;

/**
 * Fallos RÁPIDOS al abrir una conexión nueva (antes de enviar consulta alguna), que se pueden
 * reintentar sin riesgo: el pooler de Neon cortando el arranque, un socket TLS que se cae o la
 * autenticación que vence mientras la compute despierta. No incluye los vencimientos de
 * `connectionTimeoutMillis` («due to connection timeout», «timeout expired»): ya esperaron el tope
 * completo y reintentarlos lo duplicaría (riesgo de topar el `maxDuration` de la función). Tampoco
 * «timeout exceeded when trying to connect» (la espera de un cupo libre) ni credenciales inválidas.
 */
export function esFalloDeConexion(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (/due to connection timeout|timeout expired|timeout exceeded/i.test(e.message)) return false;
  const codigo = "code" in e ? String(e.code) : "";
  if (["ECONNRESET", "ECONNREFUSED", "EPIPE", "EAI_AGAIN"].includes(codigo)) return true;
  return /Connection terminated|Authentication timed out|before secure TLS/i.test(e.message);
}

/**
 * Pool con un reintento al abrir conexión. Prisma pide conexiones con `connect()` (transacciones)
 * y con `query()`, que internamente usa `connect(callback)`; ambas formas pasan por aquí.
 */
export class PoolConReintento extends pg.Pool {
  override connect(): Promise<pg.PoolClient>;
  override connect(callback: AlConectar): void;
  override connect(callback?: AlConectar): Promise<pg.PoolClient> | void {
    const intento = this.#conectar();
    if (!callback) return intento;
    // El callback corre fuera de la cadena de la promesa (como en pg-pool): si lanza, no queda
    // como rechazo sin manejar. `done` respeta la semántica de pg-pool: cualquier valor truthy
    // descarta la conexión en vez de devolverla al pool.
    intento.then(
      (cliente) => {
        const done: Liberar = (r) =>
          cliente.release(r ? (r instanceof Error ? r : true) : undefined);
        process.nextTick(() => callback(undefined, cliente, done));
      },
      (e: Error) => process.nextTick(() => callback(e, undefined, () => undefined)),
    );
  }

  async #conectar(): Promise<pg.PoolClient> {
    try {
      return await super.connect();
    } catch (e) {
      if (!esFalloDeConexion(e)) throw e;
      await new Promise((r) => setTimeout(r, PAUSA_REINTENTO_MS));
      return super.connect();
    }
  }
}

/**
 * Un solo pool por instancia (lo guarda `client.ts` en `globalThis`). Sus clientes serializan las
 * consultas y, en Vercel (Fluid compute), `attachDatabasePool` mantiene viva la función hasta que
 * el pool cierra sus conexiones ociosas: sin eso, la instancia se suspende con sockets abiertos que
 * Neon corta y la siguiente request recibe «Connection terminated unexpectedly» o P1017. Fuera de
 * Vercel `attachDatabasePool` no hace nada.
 */
export function crearPool(config: pg.PoolConfig): PoolConReintento {
  const pool = new PoolConReintento({ ...config, Client: ClienteSerial });
  attachDatabasePool(pool);
  return pool;
}
