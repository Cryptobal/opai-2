import { describe, expect, it } from "vitest";

import {
  dependenciaFaltante,
  ENTRADAS_CATALOGO,
  entradaCatalogo,
  tienePrecioAparte,
  esIncluidoEnBase,
  etiquetaUnidad,
  PARTES_FINANZAS,
  partesConPrecio,
  partesDeEmpresa,
  textoPrecioLista,
} from "./index";

describe("catálogo comercial (CAR-204)", () => {
  it("lo incluido en el plan base no es cobrable ni sugiere forma ni unidad", () => {
    for (const id of ["tickets", "portal_trabajador", "portal_cliente"]) {
      expect(esIncluidoEnBase(id)).toBe(true);
      expect(tienePrecioAparte(id)).toBe(false);
      const e = entradaCatalogo(id);
      expect(e?.incluidoEnBase).toBe(true);
      expect(e?.formaSugerida).toBeNull();
      expect(e?.unidadSugerida).toBeNull();
    }
  });

  it("el Agente interno sigue cobrable hasta que Carlos decida", () => {
    expect(esIncluidoEnBase("agente")).toBe(false);
    expect(tienePrecioAparte("agente")).toBe(true);
  });

  it("el plan base es cobrable y no está 'incluido en el base'", () => {
    expect(tienePrecioAparte("base")).toBe(true);
    expect(entradaCatalogo("base")?.incluidoEnBase).toBe(false);
  });

  it("Finanzas tiene siete partes y ninguna se repite", () => {
    const partes = ENTRADAS_CATALOGO.filter((e) => e.grupo === "parte_finanzas").map((e) => e.id);
    expect(partes).toEqual([...PARTES_FINANZAS]);
    expect(new Set(ENTRADAS_CATALOGO.map((e) => e.id)).size).toBe(ENTRADAS_CATALOGO.length);
  });

  it("valida las dependencias de las partes", () => {
    const con = (...ids: string[]) => new Set(ids);
    expect(dependenciaFaltante("finanzas.flujo", con())).toBe("Flujo de caja necesita Bancos");
    expect(dependenciaFaltante("finanzas.flujo", con("finanzas.bancos"))).toBeNull();
    expect(dependenciaFaltante("finanzas.cobranza", con("finanzas.bancos"))).toBe(
      "Cobranza necesita Ventas y facturación",
    );
    expect(dependenciaFaltante("finanzas.factoring", con("finanzas.ventas"))).toBeNull();
    expect(dependenciaFaltante("finanzas.contabilidad", con())).toBe(
      "Contabilidad e informes necesita Ventas y facturación o Compras",
    );
    expect(dependenciaFaltante("finanzas.contabilidad", con("finanzas.compras"))).toBeNull();
    expect(dependenciaFaltante("finanzas.contabilidad", con("finanzas.ventas"))).toBeNull();
    expect(dependenciaFaltante("finanzas.bancos", con())).toBeNull();
  });

  it("una empresa sin partes declaradas tiene todas", () => {
    expect([...partesDeEmpresa(null)]).toEqual([...PARTES_FINANZAS]);
    expect([...partesDeEmpresa([])]).toEqual([...PARTES_FINANZAS]);
    expect([...partesDeEmpresa(["finanzas.bancos", "otra"])]).toEqual(["finanzas.bancos"]);
  });

  it("las partes con precio salen de las condiciones; Finanzas entero las trae todas", () => {
    expect([...partesConPrecio(["finanzas.bancos", "cpq"])]).toEqual(["finanzas.bancos"]);
    expect(partesConPrecio(["finanzas"]).size).toBe(7);
    expect(partesConPrecio([]).size).toBe(0);
  });

  it("escribe el precio de lista con UF y coma", () => {
    expect(
      textoPrecioLista({
        moneda: "UF",
        forma: "por_unidad",
        unidad: "trabajador_activo",
        precio: 1_000,
        minimoMensual: 50_000,
      }),
    ).toBe("UF 0,10 por trabajador activo · mínimo UF 5");
    expect(
      textoPrecioLista({
        moneda: "UF",
        forma: "fijo",
        unidad: null,
        precio: 25_000,
        minimoMensual: null,
      }),
    ).toBe("UF 2,50 al mes");
    expect(etiquetaUnidad("trabajador_activo")).toBe("Trabajador activo");
  });
});
