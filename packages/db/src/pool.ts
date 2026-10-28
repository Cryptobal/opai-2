import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

import { ClienteSerial } from "./cliente-serial";
import {
  avisarDescarte,
  conexionMuerta,
  esFalloDeConexion,
  marcarConError,
  marcarDevuelta,
} from "./pool-salud";

export { conexionMuerta, esFalloDeConexion } from "./pool-salud";

type Liberar = (release?: unknown) => void;
type AlConectar = (
  err: Error | undefined,
  client: pg.PoolClient | undefined,
  done: Liberar,
) => void;

const PAUSA_REINTENTO_MS = 300;

/**
 * Pool con un reintento al obtener conexión y sin conexiones muertas. Prisma (y Better Auth, que
 * usa el mismo cliente) pide conexiones con `connect()` (transacciones) y con `query()`, que
 * internamente usa `connect(callback)`; ambas formas pasan por aquí. Todo ocurre ANTES de enviar
 * la consulta: nunca se repite una escritura.
 */
export class PoolConReintento extends pg.Pool {
  constructor(config?: pg.PoolConfig) {
    super(config);
    // Sin un listener, el 'error' de una conexión entregada (o del pool) tumba el proceso. La
    // conexión queda marcada y no se vuelve a entregar; pg-pool ya saca del pool las ociosas.
    this.on("connect", (cliente) => cliente.on("error", () => marcarConError(cliente)));
    this.on("release", (_err: unknown, cliente: pg.PoolClient) => marcarDevuelta(cliente));
    this.on("error", (e, cliente) => {
      marcarConError(cliente);
      avisarDescarte(e);
    });
  }

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
    const tope = this.options.connectionTimeoutMillis;
    // Con `min` > 0 pg-pool conserva ociosas más allá de la inactividad: ahí no se usa ese criterio.
    const inactividad = (this.options.min ?? 0) > 0 ? 0 : (this.options.idleTimeoutMillis ?? 0);
    let reintentado = false;
    // A lo más tantos descartes como conexiones caben: tras eso, una conexión nueva o un error.
    for (let descartes = 0; ; ) {
      const inicio = Date.now();
      let cliente: pg.PoolClient;
      try {
        cliente = await super.connect();
      } catch (e) {
        if (reintentado || !esFalloDeConexion(e, Date.now() - inicio, tope)) throw e;
        reintentado = true;
        await new Promise((r) => setTimeout(r, PAUSA_REINTENTO_MS));
        continue;
      }
      if (descartes >= this.options.max || !conexionMuerta(cliente, inactividad)) return cliente;
      descartes++;
      cliente.release(true);
    }
  }
}

/**
 * Un solo pool por instancia (lo guarda `client.ts` en `globalThis`). Sus clientes serializan las
 * consultas. En Vercel (Fluid compute) el pool de la app usa `attachDatabasePool`, que mantiene
 * viva la función hasta que el pool cierra sus conexiones ociosas: sin eso, la instancia se
 * suspende con sockets abiertos que Neon corta. El pool admin (scripts y migraciones, fuera de
 * Vercel) no lo necesita. Fuera de Vercel `attachDatabasePool` no hace nada.
 */
export function crearPool(config: pg.PoolConfig, enFunciones = true): PoolConReintento {
  const pool = new PoolConReintento({ ...config, Client: ClienteSerial });
  if (enFunciones) attachDatabasePool(pool);
  return pool;
}
