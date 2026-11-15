import { describe, expect, it } from "vitest";

import {
  debeDibujarFichas,
  enlazarTitulos,
  extraerReferencias,
  filtrarEnlaces,
  hrefOpai,
  textoRespaldoFichas,
} from "./referencias";

const cuenta = {
  id: "11111111-1111-1111-1111-111111111111",
  titulo: "Acme SpA",
  detalle: "76.123.456-7",
  href: "/cuentas/11111111-1111-1111-1111-111111111111",
};
const cotiz = {
  id: "22222222-2222-2222-2222-222222222222",
  titulo: "Cotización 12",
  detalle: "Enviada",
  href: "/cotizaciones/22222222-2222-2222-2222-222222222222",
};

describe("referencias del agente (CAR-446)", () => {
  it("solo acepta rutas internas de OPAI", () => {
    expect(hrefOpai("/cuentas/a")).toBe("/cuentas/a");
    expect(hrefOpai("https://evil.example/x")).toBeNull();
    expect(hrefOpai("//evil.example")).toBeNull();
    expect(hrefOpai("javascript:alert(1)")).toBeNull();
  });

  it("extrae ítems con id, título y href de core.buscar", () => {
    const mapa = extraerReferencias({
      cuentas: [cuenta],
      otros: [{ grupo: "cotizaciones", items: [cotiz] }],
    });
    expect([...mapa.values()]).toEqual([
      { ...cuenta, campos: ["76.123.456-7"] },
      { ...cotiz, campos: ["Enviada"] },
    ]);
  });

  it("filtra enlaces inventados y enlaza títulos con href de capacidades", () => {
    const texto = "La cuenta Acme SpA tiene [malo](https://evil.example) y Cotización 12.";
    const out = enlazarTitulos(texto, [cuenta, cotiz]);
    expect(out).toContain(`[Acme SpA](${cuenta.href})`);
    expect(out).toContain(`[Cotización 12](${cotiz.href})`);
    expect(out).not.toContain("evil.example");
    expect(out).toContain("malo");
  });

  it("conserva enlaces permitidos al filtrar", () => {
    expect(filtrarEnlaces(`[x](${cuenta.href})`, new Set([cuenta.href]))).toContain(cuenta.href);
  });
});

describe("fichas del agente (CAR-523)", () => {
  it("extrae estado y campos clave del dato estructurado", () => {
    const mapa = extraerReferencias({
      id: "33333333-3333-3333-3333-333333333333",
      titulo: "Negocio Norte",
      estado: "negociacion",
      campos: ["Cliente Acme", "$12.000.000"],
      href: "/negocios/33333333-3333-3333-3333-333333333333",
      detalle: null,
    });
    expect([...mapa.values()][0]).toEqual({
      id: "33333333-3333-3333-3333-333333333333",
      titulo: "Negocio Norte",
      detalle: null,
      estado: "negociacion",
      campos: ["Cliente Acme", "$12.000.000"],
      href: "/negocios/33333333-3333-3333-3333-333333333333",
    });
  });

  it("dibuja fichas con pedido de tarjetas o lista corta; quita viñetas de respaldo", () => {
    const refs = [cuenta, cotiz];
    expect(debeDibujarFichas("Dame 2 cuentas en tarjetas", [cuenta])).toBe(true);
    expect(debeDibujarFichas("muéstrame cuentas", refs)).toBe(true);
    expect(debeDibujarFichas("hola", [])).toBe(false);
    const texto = `Aquí van dos cuentas:\n\n- [Acme SpA](${cuenta.href})\n- Otra cosa\n`;
    expect(textoRespaldoFichas(texto, [cuenta])).toBe("Aquí van dos cuentas:\n\n- Otra cosa");
  });
});
