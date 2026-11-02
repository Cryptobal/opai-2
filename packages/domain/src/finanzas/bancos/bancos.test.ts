import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { claveDedupe, claveDedupeCartola, mismoSaldoDespues, planificarDedupeCartola } from "./dedupe";
import { parsearCsvGenerico } from "./generico";
import { parsearCartolaSantander, parsearFilasSantander } from "./santander";
import { sugerirConciliacion, TOLERANCIA_CLP } from "./conciliacion";
import { calcularSaldoSugeridoSemana, finSemanaIso } from "./saldo-sugerido";
import { ETIQUETAS_FLUJO, celdasRealesDesdeMovimientos } from "./real-flujo";
import { valorCeldaExcel } from "./celda-excel";

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

  it("C4 · dos apariciones iguales en el archivo reciben ordinal distinto", () => {
    const base = claveDedupeCartola({ fecha: "2026-10-29", monto: 5000, glosa: "Transferencia" });
    const plan = planificarDedupeCartola(
      [
        { indice: 0, base, saldoDespues: null },
        { indice: 1, base, saldoDespues: null },
      ],
      [],
    );
    const leidas = plan.filter((p) => p.estado === "leida");
    expect(leidas).toHaveLength(2);
    expect(leidas[0]?.estado === "leida" && leidas[0].claveDedupe).toBe(base);
    expect(leidas[1]?.estado === "leida" && leidas[1].claveDedupe).toBe(`${base}~2`);
  });

  it("C4 · reimportar el mismo archivo no duplica movimientos", () => {
    const base = claveDedupeCartola({ fecha: "2026-10-29", monto: 5000, glosa: "Transferencia" });
    const existentes = [{ claveDedupe: base }, { claveDedupe: `${base}~2` }];
    const plan = planificarDedupeCartola(
      [
        { indice: 0, base, saldoDespues: null },
        { indice: 1, base, saldoDespues: null },
      ],
      existentes,
    );
    expect(plan.every((p) => p.estado === "duplicada")).toBe(true);
  });

  it("C6 · reimportar sin saldo: 0 filas nuevas (min(n,k))", () => {
    const base = claveDedupeCartola({ fecha: "2026-10-29", monto: 9000, glosa: "Abono" });
    const plan = planificarDedupeCartola([{ indice: 0, base, saldoDespues: null }], [{ claveDedupe: base }]);
    expect(plan.filter((p) => p.estado === "leida")).toHaveLength(0);
    expect(plan.filter((p) => p.estado === "duplicada")).toHaveLength(1);
  });

  it("C6 · tres iguales con dos guardadas inserta una", () => {
    const base = claveDedupeCartola({ fecha: "2026-10-29", monto: 4444, glosa: "Rep" });
    const plan = planificarDedupeCartola(
      [
        { indice: 0, base, saldoDespues: null },
        { indice: 1, base, saldoDespues: null },
        { indice: 2, base, saldoDespues: null },
      ],
      [{ claveDedupe: base }, { claveDedupe: `${base}~2` }],
    );
    expect(plan.filter((p) => p.estado === "duplicada")).toHaveLength(2);
    expect(plan.filter((p) => p.estado === "leida")).toHaveLength(1);
    const leida = plan.find((p) => p.estado === "leida");
    expect(leida?.estado === "leida" && leida.claveDedupe).toBe(`${base}~3`);
  });

  it("C6 · glosa terminada en #N no confunde el conteo de duplicados", () => {
    const base = claveDedupeCartola({ fecha: "2026-10-29", monto: 7000, glosa: "PAGO #2" });
    const plan = planificarDedupeCartola([{ indice: 0, base, saldoDespues: null }], [{ claveDedupe: base }]);
    expect(plan.filter((p) => p.estado === "duplicada")).toHaveLength(1);
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

describe("cartola santander xlsx", () => {
  it("N7 · normaliza Date, rich text, fórmula e hipervínculo", () => {
    const d = new Date("2026-10-29T12:00:00.000Z");
    expect(valorCeldaExcel(d)).toBe("29/10/2026");
    expect(valorCeldaExcel({ richText: [{ text: "Abono " }, { text: "cliente" }] })).toBe("Abono cliente");
    expect(valorCeldaExcel({ formula: "A1*2", result: 1500 })).toBe(1500);
    expect(valorCeldaExcel({ text: "Ver", hyperlink: "https://banco.test/mov/1" })).toBe("Ver");
  });

  it("parsea filas de encabezado sin librería vulnerable", async () => {
    const rows = [
      ["Fecha desde 01/10/2026 hasta 31/10/2026"],
      ["MONTO", "DESCRIPCIÓN", "FECHA", "N° DOC", "SUCURSAL"],
      [1500, "Abono cliente", "29/10/2026", "123", "Santiago"],
    ];
    const r = parsearFilasSantander(rows);
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0]?.monto).toBe(1500);
  });

  it("lee un xlsx mínimo con exceljs", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Cartola");
    ws.addRow(["Fecha desde 01/10/2026 hasta 31/10/2026"]);
    ws.addRow(["MONTO", "DESCRIPCIÓN", "FECHA", "N° DOC", "SUCURSAL"]);
    ws.addRow([4115000, "Transferencia recibida", "29/10/2026", "20418", "Centro"]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const r = await parsearCartolaSantander(buf);
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0]?.monto).toBe(4115000);
    expect(r.filas[0]?.referencia).toBe("20418");
  });
});

describe("saldo sugerido al cierre", () => {
  it("Paridad · finSemanaIso suma seis días al lunes", () => {
    expect(finSemanaIso("2026-10-26")).toBe("2026-11-01");
  });

  it("Paridad · suma cuentas activas y devuelve null si falta saldo posterior", () => {
    const r = calcularSaldoSugeridoSemana(
      ["c1", "c2"],
      [
        { cuentaId: "c1", fecha: "2026-10-28", id: "a", saldoDespues: 1_000_000 },
        { cuentaId: "c1", fecha: "2026-10-30", id: "b", saldoDespues: null },
        { cuentaId: "c2", fecha: "2026-10-29", id: "c", saldoDespues: 500_000 },
      ],
      "2026-11-01",
    );
    expect(r).toEqual({ saldo: 500_000, fechaCorte: "2026-10-29", cuentasSinSaldoIds: ["c1"] });
    const sinSaldo = calcularSaldoSugeridoSemana(
      ["c1"],
      [{ cuentaId: "c1", fecha: "2026-10-28", id: "a", saldoDespues: null }],
      "2026-11-01",
    );
    expect(sinSaldo.saldo).toBeNull();
  });
});

describe("capa real flujo", () => {
  it("Paridad · cobro contra factura genera celda en fila del cliente", () => {
    const celdas = celdasRealesDesdeMovimientos([
      {
        id: "m1",
        fecha: "2026-10-29",
        monto: 100_000,
        glosa: "Transferencia",
        conciliado: true,
        cobrosFactura: [{ filaEtiqueta: "Cliente A", monto: 100_000 }],
      },
    ]);
    expect(celdas).toHaveLength(1);
    expect(celdas[0]).toMatchObject({
      semana: "2026-10-26",
      filaEtiqueta: "Cliente A",
      monto: 100_000,
    });
  });

  it("Paridad · cobro sin fila de cliente va a Cobros genéricos", () => {
    const celdas = celdasRealesDesdeMovimientos([
      {
        id: "m2",
        fecha: "2026-10-29",
        monto: 50_000,
        glosa: "Cobro",
        conciliado: true,
        cobrosFactura: [{ filaEtiqueta: "", monto: 50_000 }],
      },
    ]);
    expect(celdas[0]?.filaEtiqueta).toBe(ETIQUETAS_FLUJO.cobrosSinFila);
  });
});
