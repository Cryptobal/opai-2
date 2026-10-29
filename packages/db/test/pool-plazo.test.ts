import pg from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PoolConReintento } from "../src/pool";
import { clientePlan } from "./cliente-plan";

const adelantado = () => new Error("timeout exceeded when trying to connect");
const TOPE = 10_000;

let avisos: string[];
beforeEach(() => {
  vi.useFakeTimers();
  avisos = [];
  vi.spyOn(console, "warn").mockImplementation((m: string) => void avisos.push(m));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PoolConReintento con plazo real", () => {
  it("reintenta los vencimientos adelantados con pausas crecientes hasta conectar", async () => {
    const intentos = { n: 0 };
    const Client = clientePlan(
      [1, 2, 3].map(() => ({ ms: 5, err: adelantado() })),
      intentos,
    );
    const pool = new PoolConReintento({ Client, connectionTimeoutMillis: TOPE });
    const inicio = Date.now();
    const cliente = pool.connect();
    await vi.advanceTimersByTimeAsync(1_000);
    (await cliente).release();
    expect(intentos.n).toBe(4);
    // 3 fallos de 5 ms + pausas de 100, 200 y 400 ms + 1 ms de la conexión buena.
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(5 * 3 + 100 + 200 + 400);
    expect(avisos).toEqual(
      [1, 2, 3].map((n) => `pool pg: reintento tras vencimiento adelantado (${n})`),
    );
    await pool.end();
  });

  it("un vencimiento real (el tope completo de reloj) falla una vez, sin duplicar la espera", async () => {
    const intentos = { n: 0 };
    const err = new Error("Connection terminated due to connection timeout");
    const Client = clientePlan([{ ms: TOPE, err }], intentos);
    const pool = new PoolConReintento({ Client, connectionTimeoutMillis: TOPE });
    const inicio = Date.now();
    let fin = 0;
    const resultado = pool.connect().catch((e: Error) => ((fin = Date.now()), e));
    await vi.advanceTimersByTimeAsync(TOPE * 3);
    expect(((await resultado) as Error).message).toMatch(/connection timeout/);
    expect(intentos.n).toBe(1);
    expect(avisos).toEqual([]);
    expect(fin - inicio).toBe(TOPE);
    await pool.end();
  });

  it("deja de reintentar al cumplirse el plazo real aunque los fallos sigan siendo adelantados", async () => {
    const intentos = { n: 0 };
    const pasos = Array.from({ length: 100 }, () => ({ ms: 5, err: adelantado() }));
    const Client = clientePlan(pasos, intentos);
    const pool = new PoolConReintento({ Client, connectionTimeoutMillis: 1_000 });
    const resultado = pool.connect().catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await resultado).toBeInstanceOf(Error);
    // 5 + 100 + 5 + 200 + 5 + 400 + 5 = 720 ms; la siguiente pausa (400) ya pasaría el plazo.
    expect(intentos.n).toBe(4);
    await pool.end();
  });

  it("con la base caída (conexión rechazada) reintenta una sola vez y falla rápido", async () => {
    const intentos = { n: 0 };
    const err = () => Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    const Client = clientePlan(
      [
        { ms: 1, err: err() },
        { ms: 1, err: err() },
      ],
      intentos,
    );
    const pool = new PoolConReintento({ Client, connectionTimeoutMillis: TOPE });
    const resultado = pool.connect().catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(200);
    expect(((await resultado) as Error).message).toBe("connect ECONNREFUSED");
    expect(intentos.n).toBe(2);
    await pool.end();
  });

  it("errores que no son de conexión se rechazan de inmediato", async () => {
    const intentos = { n: 0 };
    const err = new Error('password authentication failed for user "x"');
    const pool = new PoolConReintento({
      Client: clientePlan([{ ms: 5, err }], intentos),
      connectionTimeoutMillis: TOPE,
    });
    const resultado = pool.connect().catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(10);
    expect(await resultado).toBe(err);
    expect(intentos.n).toBe(1);
    expect(avisos).toEqual([]);
    await pool.end();
  });

  it("nunca reintenta después de enviar la consulta", async () => {
    const intentos = { n: 0 };
    const pool = new PoolConReintento({
      Client: clientePlan([], intentos),
      connectionTimeoutMillis: TOPE,
    });
    const caida = Object.assign(new Error("caída"), { code: "ECONNRESET" });
    // pg-pool llama `client.query(texto, valores, callback)`.
    const query = vi.spyOn(pg.Client.prototype, "query").mockImplementation(((
      ...args: unknown[]
    ) => {
      const cb = args.at(-1);
      if (typeof cb === "function") setTimeout(() => (cb as (e: Error) => void)(caida), 1);
      else return Promise.reject(caida);
    }) as typeof pg.Client.prototype.query);
    const resultado = pool.query("insert").catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(((await resultado) as Error).message).toBe("caída");
    expect(query).toHaveBeenCalledTimes(1);
    expect(intentos.n).toBe(1);
    await pool.end();
  });

  it("la conexión que se libera tarde la toma el reintento, sin pedidos ni conexiones colgadas", async () => {
    const intentos = { n: 0 };
    const pool = new PoolConReintento({
      Client: clientePlan([], intentos),
      connectionTimeoutMillis: TOPE,
      max: 1,
    });
    const a = pool.connect();
    await vi.advanceTimersByTimeAsync(1);
    const ocupada = await a;
    // El reloj de pared avanza 5 ms mientras el temporizador de la cola vence: adelantado.
    const real = Date.now.bind(Date);
    let desfase = 0;
    vi.spyOn(Date, "now").mockImplementation(() => real() - desfase);
    const b = pool.connect();
    desfase = TOPE - 5;
    await vi.advanceTimersByTimeAsync(TOPE);
    expect(pool.waitingCount).toBe(0);
    ocupada.release();
    await vi.advanceTimersByTimeAsync(500);
    const tardia = await b;
    expect(tardia).toBe(ocupada);
    expect(avisos).toEqual(["pool pg: reintento tras vencimiento adelantado (1)"]);
    tardia.release();
    expect([pool.totalCount, pool.idleCount, pool.waitingCount]).toEqual([1, 1, 0]);
    expect(intentos.n).toBe(1);
    await pool.end();
  });
});
