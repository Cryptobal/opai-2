// CAR-243 · ACTECO de la empresa: validación, formato y búsqueda en el catálogo CIIU4.CL del SII.
import { describe, expect, it } from "vitest";

import { actecoValido, ACTECO_MAX_CODIGOS, formatearActeco, leerActeco, normalizarActividades } from "./acteco";
import { actecoDelCatalogo, buscarActecos, TOTAL_CATALOGO_ACTECO } from "./acteco-catalogo";
import { CATALOGO_ACTECO } from "./generated/acteco-catalogo";

describe("ACTECO: validación y formato", () => {
  it("acepta enteros de 1 a 999.999 y formatea con 6 dígitos", () => {
    expect([801001, 11101, 1, 999_999].every(actecoValido)).toBe(true);
    expect([0, -1, 1.5, 1_000_000, null, "801001"].some(actecoValido)).toBe(false);
    expect(formatearActeco(11101)).toBe("011101");
    expect(formatearActeco(801001)).toBe("801001");
  });
  it("lee un código escrito a mano", () => {
    expect(leerActeco(" 801.001 ")).toBe(801001);
    expect(leerActeco("011101")).toBe(11101);
    expect([leerActeco(""), leerActeco("80a"), leerActeco("1234567"), leerActeco("000000")]).toEqual([null, null, null, null]);
  });
});

describe("ACTECO: varios códigos y uno principal", () => {
  it("quita repetidos y deja el principal primero", () => {
    expect(normalizarActividades({ codigos: [829900, 801001, 829900], principal: 801001 })).toEqual({
      ok: true,
      valor: { codigos: [801001, 829900], principal: 801001 },
    });
  });
  it("lista vacía sin principal es válida (aún no se informa)", () => {
    expect(normalizarActividades({ codigos: [], principal: null })).toEqual({ ok: true, valor: { codigos: [], principal: null } });
  });
  it("rechaza principal ausente, principal fuera de la lista, código inválido y exceso", () => {
    const motivo = (r: ReturnType<typeof normalizarActividades>) => (r.ok ? null : r.motivo);
    expect(motivo(normalizarActividades({ codigos: [801001], principal: null }))).toMatch(/Marca cuál es el ACTECO principal/);
    expect(motivo(normalizarActividades({ codigos: [801001], principal: 829900 }))).toMatch(/debe estar entre/);
    expect(motivo(normalizarActividades({ codigos: [], principal: 801001 }))).toMatch(/debe estar entre/);
    expect(motivo(normalizarActividades({ codigos: [0], principal: 0 }))).toMatch(/no es un ACTECO válido/);
    const muchos = Array.from({ length: ACTECO_MAX_CODIGOS + 1 }, (_, i) => 100_000 + i);
    expect(motivo(normalizarActividades({ codigos: muchos, principal: 100_000 }))).toMatch(/hasta 20/);
  });
});

describe("catálogo ACTECO del SII", () => {
  it("674 códigos únicos, ordenados, de 6 dígitos", () => {
    expect(TOTAL_CATALOGO_ACTECO).toBe(674);
    const codigos = CATALOGO_ACTECO.map(([c]) => c);
    expect(new Set(codigos).size).toBe(codigos.length);
    expect([...codigos].sort((a, b) => a - b)).toEqual(codigos);
    expect(codigos.every(actecoValido)).toBe(true);
  });
  it("trae los códigos de seguridad privada de CAR-243 y no los obsoletos", () => {
    expect(actecoDelCatalogo(801001)?.glosa).toBe("SERVICIOS DE SEGURIDAD PRIVADA PRESTADOS POR EMPRESAS");
    expect(actecoDelCatalogo(829900)?.glosa).toMatch(/^OTRAS ACTIVIDADES DE SERVICIOS DE APOYO A LAS EMPRESAS/);
    expect(actecoDelCatalogo(801000)).toBeNull();
    expect(actecoDelCatalogo(800010)).toBeNull();
  });
  it("busca por código (con o sin cero inicial), con el exacto primero", () => {
    expect(buscarActecos("801001")[0]?.codigo).toBe(801001);
    expect(buscarActecos("8010").map((e) => e.codigo)).toEqual([801001, 801002, 801003]);
    expect(buscarActecos("011101")[0]?.codigo).toBe(11101);
    expect(buscarActecos("11101")[0]?.codigo).toBe(11101);
  });
  it("busca por palabras sin tildes ni mayúsculas, todas deben aparecer", () => {
    const r = buscarActecos("seguridad privada empresas");
    expect(r.map((e) => e.codigo)).toContain(801001);
    expect(buscarActecos("vehiculos blindados").map((e) => e.codigo)).toContain(801002);
    expect(buscarActecos("xyzzy")).toEqual([]);
  });
  it("respeta el límite (1 a 50) y sin texto devuelve los primeros", () => {
    expect(buscarActecos("", 5)).toHaveLength(5);
    expect(buscarActecos("a", 500).length).toBeLessThanOrEqual(50);
    expect(buscarActecos("servicios", 0)).toHaveLength(1);
  });
});
