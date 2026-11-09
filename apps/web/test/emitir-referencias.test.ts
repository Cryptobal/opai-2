import { describe, expect, it } from "vitest";

import { construirInputBorrador, mensajeReferencias, montoDeLinea, problemaReferencias, type RefForm } from "../app/(erp)/finanzas/ventas/nuevo/emitir-util";

const LINEA = { glosa: "x", cantidad: "1", precio: "1.000", descuento: "0" };
const ref = (p: Partial<RefForm> = {}): RefForm => ({ tipo: "801", folioTexto: "4500", fecha: "2026-10-15", razon: "", ...p });

describe("referencias en Emitir (CAR-221 · A3)", () => {
  it("sin referencias no hay problema y el input no las trae", () => {
    expect(problemaReferencias([], "2026-11-07")).toBeNull();
    const i = construirInputBorrador({ cuentaId: "c", tipoDte: "33", plazo: 30, fechaEmision: "2026-11-07", lineas: [LINEA], glosa: "", dryRun: true });
    expect(i).not.toHaveProperty("referencias");
  });

  it("valida código del catálogo, folio y fecha", () => {
    expect(problemaReferencias([ref()], "2026-11-07")).toBeNull();
    expect(problemaReferencias([ref({ tipo: "99" })], "2026-11-07")).toMatch(/catálogo/);
    expect(problemaReferencias([ref({ folioTexto: "" })], "2026-11-07")).toMatch(/folio/);
    expect(problemaReferencias([ref({ fecha: "" })], "2026-11-07")).toMatch(/fecha/);
    expect(problemaReferencias([ref({ fecha: "2026-12-01" })], "2026-11-07")).toMatch(/posterior/);
  });

  it("arma las referencias del borrador con folio, fecha y razón opcional", () => {
    const i = construirInputBorrador({
      cuentaId: "c", tipoDte: "33", plazo: 30, fechaEmision: "2026-11-07", lineas: [LINEA], glosa: "",
      referencias: [ref(), ref({ tipo: "802", folioTexto: "88", razon: " HES octubre " })], dryRun: false,
    });
    expect(i.referencias).toEqual([
      { tipoDteRef: 801, folioRef: 4500, fechaRef: "2026-10-15" },
      { tipoDteRef: 802, folioRef: 88, fechaRef: "2026-10-15", razonRef: "HES octubre" },
    ]);
  });

  it("una fila recién agregada y vacía no muestra error: solo ayuda neutra, y el envío sigue bloqueado", () => {
    const vacia: RefForm = { tipo: "801", folioTexto: "", fecha: "", razon: "" };
    expect(problemaReferencias([vacia], "2026-11-07")).toMatch(/folio/); // el bloqueo no cambia
    const m = mensajeReferencias([vacia], "2026-11-07");
    expect(m.error).toBeNull();
    expect(m.ayuda).toMatch(/Completa el folio y la fecha/);
  });

  it("el error aparece cuando la persona toca la fila y desaparece al completarla", () => {
    const tocada: RefForm = { tipo: "801", folioTexto: "", fecha: "", razon: "", tocada: true };
    expect(mensajeReferencias([tocada], "2026-11-07").error).toMatch(/folio/);
    expect(mensajeReferencias([{ ...tocada, folioTexto: "4500", fecha: "2026-10-15" }], "2026-11-07")).toEqual({ error: null, ayuda: null });
  });

  it("una fila tocada y correcta no tapa la ayuda de otra fila vacía, y las filas válidas no dicen nada", () => {
    const buena = ref({ tocada: true });
    const vacia: RefForm = { tipo: "802", folioTexto: "", fecha: "", razon: "" };
    expect(mensajeReferencias([buena, vacia], "2026-11-07")).toEqual({ error: null, ayuda: expect.stringMatching(/quita la fila vacía/) });
    expect(mensajeReferencias([buena], "2026-11-07")).toEqual({ error: null, ayuda: null });
    expect(mensajeReferencias([], "2026-11-07")).toEqual({ error: null, ayuda: null });
  });

  it("la marca de fila tocada no viaja al borrador", () => {
    const i = construirInputBorrador({ cuentaId: "c", tipoDte: "33", plazo: 30, fechaEmision: "2026-11-07", lineas: [LINEA], glosa: "", referencias: [ref({ tocada: true })], dryRun: true });
    expect(JSON.stringify(i)).not.toContain("tocada");
  });
});

describe("línea del borrador: cantidad × precio − descuento (CAR-228)", () => {
  it("monto neto con descuento y decimales", () => {
    expect(montoDeLinea({ glosa: "x", cantidad: "2", precio: "1.000.000", descuento: "10" })).toBe(1_800_000);
    expect(montoDeLinea({ glosa: "x", cantidad: "0,5", precio: "1.001", descuento: "0" })).toBe(501);
  });
  it("sin precio, con cantidad rara o con descuento imposible no hay monto", () => {
    expect(montoDeLinea({ ...LINEA, precio: "" })).toBeNull();
    expect(montoDeLinea({ ...LINEA, cantidad: "abc" })).toBeNull();
    expect(montoDeLinea({ ...LINEA, descuento: "101" })).toBeNull();
    expect(montoDeLinea({ ...LINEA, descuento: "100" })).toBeNull();
  });
  it("el input trae fecha, cantidad, precio y descuento solo si lo hay", () => {
    const sin = construirInputBorrador({ cuentaId: "c", tipoDte: "33", plazo: 30, fechaEmision: "2026-11-05", lineas: [LINEA], glosa: "", dryRun: true });
    expect(sin.fechaEmision).toBe("2026-11-05");
    expect(sin.lineas).toEqual([{ glosa: "x", monto: 1000, cantidad: "1", precioUnitario: 1000 }]);
    const con = construirInputBorrador({ cuentaId: "c", tipoDte: "33", plazo: 30, fechaEmision: "2026-11-05", lineas: [{ ...LINEA, descuento: "15,5" }], glosa: "", dryRun: true });
    expect(con.lineas[0]).toMatchObject({ monto: 845, descuentoPct: 1550 });
  });
});
