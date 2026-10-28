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
 * Fallos al ABRIR una conexión nueva (antes de enviar consulta alguna), que se pueden reintentar
 * sin riesgo: Neon despertando la compute, el pooler cortando el arranque o un socket TLS que se
 * cae. No incluye «timeout exceeded when trying to connect», que es la espera de un cupo libre del
 * pool (reintentar solo duplicaría la espera), ni credenciales inválidas.
 */
export function esFalloDeConexion(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const codigo = "code" in e ? String(e.code) : "";
  if (["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "EAI_AGAIN"].includes(codigo))
    return true;
  return /Connection terminated|timeout expired|Authentication timed out|before secure TLS/i.test(
    e.message,
  );
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
    intento.then(
      (cliente) =>
        callback(undefined, cliente, (r) =>
          cliente.release(r === true || r instanceof Error ? r : undefined),
        ),
      (e: Error) => callback(e, undefined, () => undefined),
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
