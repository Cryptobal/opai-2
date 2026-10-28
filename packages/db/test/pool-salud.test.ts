import pg from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";

import { conexionMuerta, PoolConReintento } from "../src/pool";
import { marcarConError, marcarDevuelta } from "../src/pool-salud";
import { clienteFalso } from "./cliente-falso";

afterEach(() => vi.restoreAllMocks());

const vencido = () => new Error("Connection terminated due to connection timeout");

describe("conexiones tras reanudar la instancia (Fluid compute)", () => {
  it("reintenta una vez el vencimiento adelantado; el que esperó el tope no se reintenta", async () => {
    const fallos = [vencido()];
    const pool = new PoolConReintento({
      Client: clienteFalso(fallos),
      connectionTimeoutMillis: 10_000,
    });
    const cliente = await pool.connect();
    cliente.release();
    // Sin tope configurado no hay forma de saber que fue adelantado: no se reintenta.
    const sinTope = new PoolConReintento({ Client: clienteFalso([vencido()]) });
    await expect(sinTope.connect()).rejects.toThrow("due to connection timeout");
    // Dos adelantados seguidos: un solo reintento.
    const dos = new PoolConReintento({
      Client: clienteFalso([vencido(), vencido()]),
      connectionTimeoutMillis: 10_000,
    });
    await expect(dos.connect()).rejects.toThrow("due to connection timeout");
    await Promise.all([pool.end(), sinTope.end(), dos.end()]);
  });

  it("no entrega una conexión ociosa que superó la inactividad o que emitió 'error'", async () => {
    const pool = new PoolConReintento({
      Client: clienteFalso([]),
      idleTimeoutMillis: 5_000,
      max: 3,
    });
    const primera = await pool.connect();
    primera.release();
    // Estuvo 60 s en el pool por reloj de pared: la instancia estuvo suspendida.
    marcarDevuelta(primera, Date.now() - 60_000);
    const segunda = await pool.connect();
    expect(segunda).not.toBe(primera);
    expect(pool.totalCount).toBe(1);
    segunda.release();
    const reusada = await pool.connect();
    expect(reusada).toBe(segunda);
    reusada.emit("error", new Error("server conn crashed?"));
    reusada.release();
    const tercera = await pool.connect();
    expect(tercera).not.toBe(reusada);
    tercera.release();
    await pool.end();
  });

  it("detecta socket cerrado, error y exceso de inactividad sin consultar", () => {
    const cliente = new pg.Client();
    expect(conexionMuerta(cliente, 5_000)).toBe(false);
    marcarDevuelta(cliente, 1_000);
    expect(conexionMuerta(cliente, 5_000, 5_500)).toBe(false);
    expect(conexionMuerta(cliente, 5_000, 7_000)).toBe(true);
    expect(conexionMuerta(cliente, 0, 7_000)).toBe(false);
    const cerrado = new pg.Client();
    cerrado.connection.stream.destroy();
    expect(conexionMuerta(cerrado, 5_000)).toBe(true);
    const conError = new pg.Client();
    marcarConError(conError);
    expect(conexionMuerta(conError, 5_000)).toBe(true);
  });

  it("un 'error' del pool o de una conexión entregada no tumba el proceso y se avisa sin datos", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const pool = new PoolConReintento({ Client: clienteFalso([]) });
    const cliente = await pool.connect();
    expect(() => cliente.emit("error", new Error("Connection terminated unexpectedly"))).not.toThrow();
    cliente.release(true);
    const caido = Object.assign(new Error("x"), { code: "ECONNRESET" });
    expect(() => pool.emit("error", caido, cliente)).not.toThrow();
    expect(aviso).toHaveBeenCalledWith(
      "pool pg: conexión ociosa descartada por error (ECONNRESET).",
    );
    await pool.end();
  });
});
