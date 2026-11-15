import { describe, expect, it } from "vitest";

import { filasCartolaHistorica, filasConsultaMovimientos, xlsxOfficeBanking } from "./cartola-office-banking.fixture";
import { ErrorCartola } from "./limites-cartola";
import { parsearCartolaSantander, parsearFilasSantander } from "./santander";

// Formatos reales de Office Banking (CAR-327), con fixtures sintéticos.
describe("cartola Santander de Office Banking (CAR-327)", () => {
  it("histórica: salta saldos y línea de crédito, toma el encabezado real y usa CARGO/ABONO para el signo", async () => {
    const buf = await xlsxOfficeBanking(
      filasCartolaHistorica([
        [15000, "Transf a proveedor ficticio", "05/10/2026", "123", "Santiago", "C"],
        [-8000, "Comisión ficticia", "06/10/2026", "124", "Santiago", "C"],
        [250000, "Abono cliente ficticio", "07/10/2026", "456", "Providencia", "A"],
      ]),
    );
    const r = await parsearCartolaSantander(buf);
    expect(r.rechazadas).toEqual([]);
    expect(r.filas.map((f) => [f.fecha, f.monto, f.referencia])).toEqual([
      ["2026-10-05", -15000, "123"],
      ["2026-10-06", -8000, "124"],
      ["2026-10-07", 250000, "456"],
    ]);
    expect(r.filas.every((f) => f.saldoDespues === null)).toBe(true);
    expect([r.fechaDesde, r.fechaHasta]).toEqual(["2026-10-01", "2026-10-31"]);
  });

  it("consulta de movimientos: lee SALDO y N° DOCUMENTO con su columna", async () => {
    const buf = await xlsxOfficeBanking(
      filasConsultaMovimientos([
        [30000, "Transf a persona ficticia", "11/11/2026", 970000, "777", "Las Condes", "C", 1],
        [50000, "Depósito ficticio", "12/11/2026", 1020000, "778", "Las Condes", "A", 2],
      ]),
    );
    const r = await parsearCartolaSantander(buf);
    expect(r.filas.map((f) => [f.monto, f.saldoDespues, f.referencia])).toEqual([
      [-30000, 970000, "777"],
      [50000, 1020000, "778"],
    ]);
  });

  it("la fila de línea de crédito («MONTO UTILIZADO») no es el encabezado", () => {
    const r = parsearFilasSantander([
      ["CUPO APROBADO", "MONTO UTILIZADO", "SALDO DISPONIBLE"],
      [500000, 0, 500000],
      ["MONTO", "DESCRIPCIÓN MOVIMIENTO", "FECHA", "CARGO/ABONO"],
      [1000, "Abono ficticio", "01/11/2026", "A"],
    ]);
    expect(r.filas).toHaveLength(1);
    expect(r.rechazadas).toEqual([]);
  });

  it("sin encabezado del detalle es un error de negocio, no interno", () => {
    expect(() => parsearFilasSantander([["Hola"], ["MONTO UTILIZADO", "SALDO"]])).toThrow(ErrorCartola);
  });

  it("un archivo que no es XLSX es un error de negocio", async () => {
    await expect(parsearCartolaSantander(Buffer.from("no es un xlsx"))).rejects.toThrow(ErrorCartola);
  });
});
