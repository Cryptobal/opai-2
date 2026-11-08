import { describe, expect, it } from "vitest";

import { chequeoResolucionSii, resolucionSiiValida } from "../src/finanzas/resolucion-sii";

describe("resolución SII · 0 solo en certificación (CAR-196)", () => {
  it("la regla pura", () => {
    expect(resolucionSiiValida("certificacion", 0)).toBe(true);
    expect(resolucionSiiValida("certificacion", 80)).toBe(true);
    expect(resolucionSiiValida("produccion", 0)).toBe(false);
    expect(resolucionSiiValida("produccion", 80)).toBe(true);
    expect(resolucionSiiValida("certificacion", null)).toBe(false);
    expect(resolucionSiiValida("certificacion", -1)).toBe(false);
    expect(resolucionSiiValida("produccion", undefined)).toBe(false);
  });

  function resolucion(ambiente: string, numero: number | null, proveedor = "simpleapi") {
    const items: { codigo: string; ok: boolean; mensaje: string; bloqueante: boolean }[] = [];
    chequeoResolucionSii(
      proveedor,
      { ambiente, resolucionSiiNumero: numero, resolucionSiiFecha: new Date("2023-01-10T00:00:00Z") },
      (d) => d.toISOString().slice(0, 10),
      (codigo, ok, mensaje, bloqueante) => items.push({ codigo, ok, mensaje, bloqueante }),
    );
    return items.find((i) => i.codigo === "resolucion_sii");
  }

  it("preflight: resolución 0 pasa en certificación", () => {
    expect(resolucion("certificacion", 0)).toMatchObject({ ok: true, bloqueante: false });
  });
  it("preflight: resolución 0 bloquea en producción", () => {
    expect(resolucion("produccion", 0)).toMatchObject({ ok: false, bloqueante: true });
  });
  it("preflight: en producción un número mayor que 0 pasa", () => {
    expect(resolucion("produccion", 80)).toMatchObject({ ok: true });
  });
  it("preflight: sin número sigue bloqueando (salvo modo simulado)", () => {
    expect(resolucion("certificacion", null)).toMatchObject({ ok: false, bloqueante: true });
    expect(resolucion("certificacion", null, "simulado")).toMatchObject({ ok: true, bloqueante: false });
  });
});
