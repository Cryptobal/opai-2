import { describe, expect, it } from "vitest";

import { xlsxOfficeBanking } from "./cartola-office-banking.fixture";
import { parsearCartolaSantander, parsearFilasSantander } from "./santander";
import { enteroPesos, esFinDeDetalle } from "./santander-secciones";

type Celda = string | number | null;

/** Cartola histórica ficticia con todas sus secciones (CAR-341). Datos inventados. */
function historicaCompleta(saldoInicial: number, saldoFinal: number, movs: Celda[][], comisiones: Celda[][]): Celda[][] {
  const titulo = (t: string): Celda[] => Array.from({ length: 6 }, () => t);
  return [
    ["Cartola Histórica Cuenta Corriente"],
    ["Número cartola: 16", null, "Fecha desde: 01/09/2025", "Fecha hasta: 30/09/2025"],
    titulo("Saldos"),
    ["SALDO INICIAL", "DEPÓSITOS", "OTROS ABONOS", "CHEQUES", "OTROS CARGOS", "IMPUESTOS", "SALDO FINAL"],
    [saldoInicial, 0, 0, 0, 0, 0, saldoFinal],
    titulo("Línea de crédito"),
    ["CUPO APROBADO", "MONTO UTILIZADO", "SALDO DISPONIBLE"],
    [500000, 0, 500000],
    titulo("Detalle movimientos"),
    ["MONTO", "DESCRIPCIÓN MOVIMIENTO", "FECHA", "N° DOCUMENTO", "SUCURSAL", "CARGO/ABONO"],
    ...movs,
    titulo("Resumen comisiones"),
    ["DESCRIPCIÓN", "MONTO"],
    ...comisiones,
    titulo("Saldos diarios"),
    ["SALDO", "FECHA"],
    [990000, "30/09/2025"],
  ];
}

const DETALLE: Celda[][] = [
  [250000, "Abono cliente ficticio", "02/09/2025", "1", "Santiago", "A"],
  [37203, "COM.MANTENCION PLAN", "05/09/2025", "2", "Santiago", "C"],
  [7069, "IVA COMISION", "05/09/2025", "3", "Santiago", "C"],
  [215728, "Transf a proveedor ficticio", "10/09/2025", "4", "Santiago", "C"],
];

describe("cartola Santander: solo el bloque de detalle (CAR-341)", () => {
  it("corta en «Resumen comisiones»: las comisiones no se importan dos veces ni con el monto ÷1000", async () => {
    const buf = await xlsxOfficeBanking(
      historicaCompleta(1000000, 990000, DETALLE, [["COM.MANTENCION PLAN", -37.203], ["IVA COMISION", -7.069]]),
    );
    const r = await parsearCartolaSantander(buf);
    expect(r.filas.map((f) => f.monto)).toEqual([250000, -37203, -7069, -215728]);
    expect(r.rechazadas).toEqual([]);
    expect([r.fechaDesde, r.fechaHasta]).toEqual(["2025-09-01", "2025-09-30"]);
  });

  it("«Sin comisiones en el período» tampoco genera rechazos", () => {
    const r = parsearFilasSantander(historicaCompleta(1000000, 990000, DETALLE, [["Sin comisiones en el período"]]));
    expect(r.filas).toHaveLength(4);
    expect(r.rechazadas).toEqual([]);
  });

  it("cuadra: saldo inicial + detalle = saldo final", () => {
    const r = parsearFilasSantander(historicaCompleta(1000000, 990000, DETALLE, []));
    expect(r.cuadratura).toEqual({ saldoInicial: 1000000, saldoFinal: 990000, sumaDetalle: -10000, diferencia: 0, cuadra: true });
    expect(r.saldoFinal).toBe(990000);
  });

  it("no cuadra: informa la diferencia", () => {
    const r = parsearFilasSantander(historicaCompleta(1000000, 995000, DETALLE, []));
    expect(r.cuadratura).toMatchObject({ cuadra: false, diferencia: -5000 });
  });

  it("sin bloque de saldos no hay cuadratura (consulta de movimientos)", () => {
    const r = parsearFilasSantander([
      ["MONTO", "DESCRIPCIÓN MOVIMIENTO", "FECHA", "CARGO/ABONO"],
      [1000, "Abono ficticio", "01/11/2026", "A"],
    ]);
    expect(r.cuadratura).toBeNull();
  });

  it("explica cada fila rechazada del detalle", () => {
    const r = parsearFilasSantander(
      historicaCompleta(0, 0, [
        [1000, "Sin fecha", "31-13-2025", "1", "S", "A"],
        [12.5, "Con decimales", "01/09/2025", "2", "S", "A"],
        ["mil", "Monto texto", "01/09/2025", "3", "S", "A"],
        [0, "Monto cero", "01/09/2025", "4", "S", "A"],
        [1000, "", "01/09/2025", "5", "S", "A"],
      ], []),
    );
    expect(r.filas).toEqual([]);
    expect(r.rechazadas.map((x) => x.motivo)).toEqual([
      "La fecha «31-13-2025» no tiene el formato dd/mm/aaaa.",
      "El monto «12.5» trae decimales; en pesos no hay decimales.",
      "El monto «mil» no es un entero de pesos (ej.: 1.234.567).",
      "Monto en cero: no es un movimiento.",
      "Sin descripción del movimiento.",
    ]);
  });

  it("títulos de sección y montos del bloque de saldos", () => {
    expect(esFinDeDetalle(["Resumen comisiones"])).toBe(true);
    expect(esFinDeDetalle(["Saldos diarios", "Saldos diarios"])).toBe(true);
    expect(esFinDeDetalle([1000, "Abono", "01/09/2025"])).toBe(false);
    expect([enteroPesos("1.234.567"), enteroPesos("−37.203"), enteroPesos(12.5), enteroPesos("abc")]).toEqual([
      1234567, -37203, null, null,
    ]);
  });
});
