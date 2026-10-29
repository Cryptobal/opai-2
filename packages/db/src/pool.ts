import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

import { ClienteSerial } from "./cliente-serial";
import {
  avisarDescarte,
  avisarReintento,
  conexionMuerta,
  esFalloDeConexion,
  esVencimiento,
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

/** Pausas entre reintentos (la última se repite) hasta agotar el plazo real de la conexión. */
const PAUSAS_REINTENTO_MS = [100, 200, 400];

/**
 * Espera `ms` de reloj de pared. Tras reanudar la instancia, un `setTimeout` puede despertar antes
 * de tiempo (el reloj del event loop quedó atrás): si falta tiempo real, se vuelve a armar.
 */
export async function esperarReloj(ms: number): Promise<void> {
  const fin = Date.now() + ms;
  for (let falta = ms; falta > 0; falta = fin - Date.now()) {
    await new Promise((r) => setTimeout(r, falta));
  }
}

/**
 * Pool que reintenta al obtener conexión y no entrega conexiones muertas. Prisma (y Better Auth,
 * que usa el mismo cliente) pide conexiones con `connect()` (transacciones) y con `query()`, que
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

  /**
   * Reintenta los vencimientos adelantados con pausas crecientes mientras no se cumpla el plazo
   * real (`connectionTimeoutMillis`, medido con `Date.now()`): tras reanudar la instancia los
   * temporizadores de pg vencen de inmediato y un solo reintento no alcanzaba. Un vencimiento real
   * (≥ la mitad del tope por reloj) no se reintenta: `esFalloDeConexion` lo descarta. El plazo
   * decide si empieza otro intento; ese intento puede esperar su propio tope, así que el peor caso
   * es menos de 2× `connectionTimeoutMillis`. Los demás fallos de conexión, un solo reintento.
   * Nada de esto ocurre después de enviar una consulta.
   */
  async #conectar(): Promise<pg.PoolClient> {
    const tope = this.options.connectionTimeoutMillis ?? 0;
    const limite = Date.now() + tope;
    // Con `min` > 0 pg-pool conserva ociosas más allá de la inactividad: ahí no se usa ese criterio.
    const inactividad = (this.options.min ?? 0) > 0 ? 0 : (this.options.idleTimeoutMillis ?? 0);
    let reintentos = 0;
    let otrosFallos = 0;
    // A lo más tantos descartes como conexiones caben: tras eso, una conexión nueva o un error.
    for (let descartes = 0; ; ) {
      const inicio = Date.now();
      let cliente: pg.PoolClient;
      try {
        cliente = await super.connect();
      } catch (e) {
        const ahora = Date.now();
        if (!esFalloDeConexion(e, ahora - inicio, tope)) throw e;
        const pausa = PAUSAS_REINTENTO_MS[Math.min(reintentos, PAUSAS_REINTENTO_MS.length - 1)]!;
        // Un vencimiento adelantado se reintenta hasta el plazo; otro fallo de conexión (socket
        // cortado, conexión rechazada) solo una vez: con la base caída, fallar rápido.
        if (esVencimiento(e) ? ahora + pausa >= limite : otrosFallos++ > 0) throw e;
        reintentos++;
        avisarReintento(e, reintentos);
        await esperarReloj(pausa);
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
