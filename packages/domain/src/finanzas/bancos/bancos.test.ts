import { describe, expect, it } from "vitest";

import { claveDedupe, mismoSaldoDespues } from "./dedupe";
import { parsearCsvGenerico } from "./generico";
import { sugerirConciliacion, TOLERANCIA_CLP } from "./conciliacion";

describe("bancos dedupe", () => {
  it("arma la clave fecha|monto|glosa|referencia", () => {
    expect(claveDedupe({ fecha: "2026-10-29", monto: 1000, glosa: "Abono", referencia: "99" })).toBe(
      "2026-10-29|1000|ABONO|99",
    );
  });

  it("detecta mismo saldo posterior", () => {
    expect(mismoSaldoDespues(100n, 100)).toBe(true);
    expect(mismoSaldoDespues(100n, 101)).toBe(false);
  });
});

describe("conciliacion sugerencias", () => {
  it("calza por saldo pendiente con tolerancia 1 CLP", () => {
    const s = sugerirConciliacion(
      { monto: 4115000, glosa: "Transferencia 12.345.678-5", fecha: "2026-10-29" },
      [
        {
          id: "d1",
          tipo: "documento_emitido",
          montoTotal: 4115000,
          montoPendiente: 4115000,
          rut: "12345678-5",
          glosa: "Folio 20418",
          fecha: "2026-10-20",
        },
      ],
    );
    expect(s[0]?.nivel).toBe("saldo_pendiente");
    expect(s[0]?.confianza).toBe(1);
    expect(TOLERANCIA_CLP).toBe(1);
  });
});

describe("cartola generica csv", () => {
  it("parsea filas con mapeo", () => {
    const csv = "fecha,monto,glosa\n29/10/2026,1500,Abono cliente\n";
    const { filas } = parsearCsvGenerico(csv, { fecha: "fecha", monto: "monto", glosa: "glosa" });
    expect(filas).toHaveLength(1);
    expect(filas[0]?.monto).toBe(1500);
  });
});
