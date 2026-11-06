import { describe, expect, it } from "vitest";

import {
  agruparPorBeneficiario, codigoLote, codigoSbif, COLUMNAS_NOMINA, filasDeNomina, HOJA_NOMINA, nombreArchivoNomina, puedeAprobarLote,
  puedeTransitarLote, sinRendicionPropia, totalLote, totalNomina, validarFilasNomina, validarSeleccion, type FilaNomina,
} from "./index";

const r = (id: string, extra = {}) => ({ id, estado: "aprobada", montoTotal: 1000, solicitanteId: "u1", conCuenta: true, ...extra });

describe("lote de pago · totales y unicidad", () => {
  it("el total es la suma exacta en CLP entero", () => {
    expect(totalLote([{ montoTotal: 12_500 }, { montoTotal: 7_490 }, { montoTotal: 10 }])).toBe(20_000);
    expect(totalLote([])).toBe(0);
  });
  it("acepta una selección válida", () => {
    expect(validarSeleccion(["a", "b"], [r("a"), r("b")])).toEqual([]);
  });
  it("rechaza vacía, repetida, no aprobada, en otro lote y sin cuenta", () => {
    expect(validarSeleccion([], [])).toContain("Elige al menos una rendición.");
    expect(validarSeleccion(["a", "a"], [r("a")])).toContain("Una rendición está repetida en la selección.");
    expect(validarSeleccion(["a"], [r("a", { estado: "enviada" })])).toContain("Solo se pagan rendiciones aprobadas.");
    expect(validarSeleccion(["a"], [r("a", { loteActivoId: "L1" })])).toContain("Una rendición ya está en otro lote activo.");
    expect(validarSeleccion(["a"], [r("a", { conCuenta: false })])).toContain("Una persona no tiene datos bancarios en su ficha.");
    expect(validarSeleccion(["a", "x"], [r("a")])).toContain("Una rendición no existe.");
  });
  it("rechaza más del tope", () => {
    const ids = Array.from({ length: 201 }, (_, i) => `r${i}`);
    expect(validarSeleccion(ids, ids.map((id) => r(id)))).toContain("Un lote admite hasta 200 rendiciones.");
  });
  it("código visible", () => expect(codigoLote(7)).toBe("LP-7"));
});

describe("lote de pago · transiciones", () => {
  it("camino feliz y atajo manual", () => {
    expect(puedeTransitarLote("borrador", "aprobado")).toBe(true);
    expect(puedeTransitarLote("aprobado", "generado")).toBe(true);
    expect(puedeTransitarLote("generado", "pagado")).toBe(true);
    expect(puedeTransitarLote("aprobado", "pagado")).toBe(true);
  });
  it("no salta ni retrocede", () => {
    expect(puedeTransitarLote("borrador", "generado")).toBe(false);
    expect(puedeTransitarLote("borrador", "pagado")).toBe(false);
    expect(puedeTransitarLote("generado", "aprobado")).toBe(false);
  });
  it("pagado y anulado son finales", () => {
    for (const e of ["borrador", "aprobado", "generado", "pagado", "anulado"] as const) {
      expect(puedeTransitarLote("pagado", e)).toBe(false);
      expect(puedeTransitarLote("anulado", e)).toBe(false);
    }
  });
});

describe("lote de pago · segregación", () => {
  it("nadie actúa sobre una rendición propia", () => {
    expect(sinRendicionPropia("u1", ["u2", "u3"])).toBe(true);
    expect(sinRendicionPropia("u1", ["u2", "u1"])).toBe(false);
  });
  it("quien crea no aprueba si hay otra persona con el permiso", () => {
    expect(puedeAprobarLote("c", "c", ["c", "d"])).toBe(false);
    expect(puedeAprobarLote("c", "d", ["c", "d"])).toBe(true);
  });
  it("caso de una sola persona con el permiso: puede aprobar el suyo", () => {
    expect(puedeAprobarLote("c", "c", ["c"])).toBe(true);
    expect(puedeAprobarLote("c", "c", [])).toBe(true);
  });
});

const fila = (extra: Partial<FilaNomina> = {}): FilaNomina => ({
  cuentaDestino: "12345678901", codigoBanco: "037", rut: "11.111.111-1", nombre: "Pérez Gómez Ana", montoClp: 45_000, correo: "ana.perez.demo@example.com", ...extra,
});
const par = { cuentaOrigen: "99998888", glosa: "LOTE-2026-0099" };

describe("nómina Santander (formato confirmado por Carlos, 6-nov-2026)", () => {
  it("13 columnas con los encabezados exactos, en orden", () => {
    expect(COLUMNAS_NOMINA).toEqual([
      "Cuenta origen", "Moneda origen", "Cuenta destino", "Moneda destino", "Codigo banco destino", "RUT beneficiario",
      "Nombre beneficiario", "Monto transferencia", "Glosa personalizada transferencia", "Correo beneficiario",
      "Mensaje correo beneficiario", "Glosa cartola originador", "Glosa cartola beneficiario",
    ]);
    expect(HOJA_NOMINA).toBe("Santander");
    expect(nombreArchivoNomina("LP-7")).toBe("LP-7-santander.xlsx");
  });
  it("reproduce la fila del ejemplo ficticio: sin relleno, con tildes y K, L y M vacías", () => {
    const [f] = filasDeNomina([fila()], par);
    expect(f).toEqual(["99998888", "CLP", "12345678901", "CLP", "037", "11.111.111-1", "Pérez Gómez Ana", 45000, "LOTE-2026-0099", "ana.perez.demo@example.com", "", "", ""]);
    expect(f).toHaveLength(13);
  });
  it("códigos SBIF de la lista de Carlos, por nombre o por código", () => {
    const casos: [string, string][] = [["Banco de Chile", "001"], ["BancoEstado", "012"], ["Banco Estado", "012"], ["Scotiabank", "014"], ["BCI", "016"], ["MACH", "016"], ["Santander", "037"], ["Itaú", "039"], ["Banco Falabella", "051"], ["Mercado Pago", "299"], ["Edwards-Citi", "504"], ["Coopeuch", "672"], ["Tenpo", "730"], ["Prex", "743"], ["037", "037"]];
    for (const [banco, sbif] of casos) expect(codigoSbif(banco)).toBe(sbif);
    expect(codigoSbif("Banco Inexistente")).toBeNull();
    expect(codigoSbif("999")).toBeNull();
    expect(codigoSbif(null)).toBeNull();
  });
  it("valida y dice qué le falta a cada beneficiario, incluido el dígito verificador y el monto", () => {
    expect(validarFilasNomina([fila()], par)).toEqual([]);
    const e = validarFilasNomina([fila({ rut: "11.111.111-9" }), fila({ rut: "", cuentaDestino: "", codigoBanco: "", nombre: "Luis Soto" }), fila({ montoClp: 0 })], { ...par, cuentaOrigen: "" });
    expect(e[0]).toMatch(/cuenta de origen/);
    expect(e).toContain("Beneficiario 1 (Pérez Gómez Ana): falta RUT válido (dígito verificador).");
    expect(e).toContain("Beneficiario 2 (Luis Soto): falta RUT, cuenta destino, código SBIF del banco.");
    expect(e).toContain("Beneficiario 3 (Pérez Gómez Ana): falta monto mayor que cero.");
    expect(validarFilasNomina([], par)).toContain("El lote no tiene beneficiarios.");
  });
  it("una transferencia por persona y el total coincide con el del lote", () => {
    const filas = agruparPorBeneficiario([fila({ montoClp: 10_000 }), fila({ rut: "11111111-1", montoClp: 5_500 }), fila({ rut: "22.222.222-2", nombre: "Luis", montoClp: 4_000 })]);
    expect(filas).toHaveLength(2);
    expect(totalNomina(filas)).toBe(19_500);
    expect(totalNomina(filas)).toBe(totalLote([{ montoTotal: 10_000 }, { montoTotal: 5_500 }, { montoTotal: 4_000 }]));
  });
});
