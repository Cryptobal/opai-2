import { describe, expect, it } from "vitest";

import {
  enlazarTitulos,
  extraerReferencias,
  filtrarEnlaces,
  hrefOpai,
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
    expect([...mapa.values()]).toEqual([cuenta, cotiz]);
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
