import pg from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClienteSerial } from "../src/cliente-serial";
import { esFalloDeConexion, PoolConReintento } from "../src/pool";
import { clienteFalso } from "./cliente-falso";

afterEach(() => vi.restoreAllMocks());

describe("ClienteSerial", () => {
  it("ejecuta de a una las consultas concurrentes, en orden, y un fallo no bloquea la cola", async () => {
    let enCurso = 0;
    let maximo = 0;
    const orden: string[] = [];
    vi.spyOn(pg.Client.prototype, "query").mockImplementation(((texto: string) => {
      enCurso++;
      maximo = Math.max(maximo, enCurso);
      return new Promise((resolver, rechazar) =>
        setTimeout(() => {
          enCurso--;
          orden.push(texto);
          if (texto === "falla") rechazar(new Error("falla"));
          else resolver({ rows: [texto] });
        }, 5),
      );
    }) as typeof pg.Client.prototype.query);
    const cliente = new ClienteSerial();
    const resultados = await Promise.allSettled(
      ["a", "falla", "b", "c"].map((t) => cliente.query(t)),
    );
    expect(maximo).toBe(1);
    expect(orden).toEqual(["a", "falla", "b", "c"]);
    expect(resultados.map((r) => r.status)).toEqual([
      "fulfilled",
      "rejected",
      "fulfilled",
      "fulfilled",
    ]);
  });
});

describe("esFalloDeConexion", () => {
  it("reintenta solo fallos rápidos al abrir conexión: nunca timeouts, cupo ni credenciales", () => {
    // Ya esperó el tope completo de connectionTimeoutMillis: reintentar lo duplicaría.
    const vencido = new Error("Connection terminated due to connection timeout");
    expect(esFalloDeConexion(vencido)).toBe(false);
    expect(esFalloDeConexion(vencido, 10_000, 10_000)).toBe(false);
    // Vencido a los 50 ms de un tope de 10 s: temporizador adelantado tras reanudar la instancia.
    expect(esFalloDeConexion(vencido, 50, 10_000)).toBe(true);
    expect(esFalloDeConexion(new Error("timeout exceeded when trying to connect"), 60, 10_000)).toBe(
      true,
    );
    expect(esFalloDeConexion(vencido, 50, undefined)).toBe(false);
    expect(esFalloDeConexion(new Error("timeout expired"))).toBe(false);
    expect(esFalloDeConexion(new Error("Connection terminated unexpectedly"))).toBe(true);
    expect(esFalloDeConexion(Object.assign(new Error("x"), { code: "ECONNRESET" }))).toBe(true);
    expect(esFalloDeConexion(new Error("Authentication timed out"))).toBe(true);
    expect(esFalloDeConexion(new Error("timeout exceeded when trying to connect"))).toBe(false);
    expect(esFalloDeConexion(new Error('password authentication failed for user "x"'))).toBe(false);
    expect(esFalloDeConexion("texto")).toBe(false);
  });
});

describe("PoolConReintento", () => {
  it("reintenta una vez si la conexión nueva se cae al abrir (promesa y callback)", async () => {
    const caida = () => new Error("Connection terminated unexpectedly");
    const fallos = [caida()];
    const pool = new PoolConReintento({ Client: clienteFalso(fallos) });
    const cliente = await pool.connect();
    cliente.release(true);
    fallos.push(caida());
    const porCallback = await new Promise<boolean>((resolver) =>
      pool.connect((err, c, done) => {
        done(true);
        resolver(!err && c !== undefined);
      }),
    );
    expect(porCallback).toBe(true);
    await pool.end();
  });
  it("no reintenta más de una vez ni ante errores que no son de conexión", async () => {
    const caida = () => new Error("Connection terminated unexpectedly");
    const pool = new PoolConReintento({ Client: clienteFalso([caida(), caida()]) });
    await expect(pool.connect()).rejects.toThrow("Connection terminated unexpectedly");
    const otro = new PoolConReintento({
      Client: clienteFalso([new Error("password authentication failed")]),
    });
    await expect(otro.connect()).rejects.toThrow("password authentication failed");
    await Promise.all([pool.end(), otro.end()]);
  });
});
