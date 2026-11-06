import { describe, expect, it } from "vitest";

import {
  agruparPorBeneficiario, codigoLote, COLUMNAS_NOMINA, filasDeNomina, puedeAprobarLote, puedeTransitarLote,
  sinRendicionPropia, textoPlano, totalLote, totalNomina, validarFilasNomina, validarSeleccion, type FilaNomina,
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
  cuentaDestino: "00012345678", codigoBanco: "037", rut: "11.111.111-1", nombre: "Ana Núñez Pérez", montoClp: 18_000, correo: "ana@ejemplo.test", ...extra,
});
const par = { cuentaOrigen: "000-0412-9", glosa: "Rendiciones LP-7" };

describe("nómina Santander (estructura provisoria)", () => {
  it("tiene 13 columnas y cada fila las completa", () => {
    expect(COLUMNAS_NOMINA).toHaveLength(13);
    const [f] = filasDeNomina([fila()], par);
    expect(f).toHaveLength(13);
    expect(f?.[7]).toBe(18_000);
    expect(f?.[1]).toBe("CLP");
  });
  it("normaliza caracteres y recorta largos", () => {
    expect(textoPlano("Ñandú Ópera — «x»", 45)).toBe("Nandu Opera x");
    expect(textoPlano("a".repeat(100), 20)).toHaveLength(20);
    const [f] = filasDeNomina([fila({ nombre: "Ñ".repeat(80) })], par);
    expect(String(f?.[6]).length).toBeLessThanOrEqual(45);
  });
  it("valida RUT, cuenta, banco, monto, nombre y cuenta de origen", () => {
    expect(validarFilasNomina([fila()], par)).toEqual([]);
    const malos = validarFilasNomina([fila({ rut: "11.111.111-9", codigoBanco: "BCI", cuentaDestino: "", montoClp: 0, nombre: "" })], { ...par, cuentaOrigen: "" });
    expect(malos.join(" ")).toMatch(/cuenta de origen/);
    expect(malos.join(" ")).toMatch(/RUT inválido/);
    expect(malos.join(" ")).toMatch(/cuenta destino/);
    expect(malos.join(" ")).toMatch(/3 dígitos/);
    expect(malos.join(" ")).toMatch(/monto/);
    expect(malos.join(" ")).toMatch(/nombre/);
    expect(validarFilasNomina([], par)).toContain("El lote no tiene beneficiarios.");
  });
  it("una transferencia por persona y el total coincide con el del lote", () => {
    const filas = agruparPorBeneficiario([fila({ montoClp: 10_000 }), fila({ rut: "11111111-1", montoClp: 5_500 }), fila({ rut: "22.222.222-2", nombre: "Luis", montoClp: 4_000 })]);
    expect(filas).toHaveLength(2);
    expect(totalNomina(filas)).toBe(19_500);
    expect(totalNomina(filas)).toBe(totalLote([{ montoTotal: 10_000 }, { montoTotal: 5_500 }, { montoTotal: 4_000 }]));
  });
});
