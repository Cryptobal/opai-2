import { describe, expect, it } from "vitest";

import { resolucionSiiValida } from "../src/finanzas/resolucion-sii";
import { chequeosCredencialesEmision } from "../src/finanzas/ventas-preflight-credenciales";
import type { Contexto } from "../src/types";

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

  const ctx = {
    tenantId: "t",
    db: { integracion: { findUnique: async () => null } },
  } as unknown as Contexto;

  async function resolucion(ambiente: string, numero: number | null) {
    const items: { codigo: string; ok: boolean; mensaje: string; bloqueante: boolean }[] = [];
    await chequeosCredencialesEmision(
      ctx,
      "simpleapi",
      {
        ambiente,
        rutEmisor: "76111222-8",
        resolucionSiiNumero: numero,
        resolucionSiiFecha: new Date("2023-01-10T00:00:00Z"),
      },
      (codigo, ok, mensaje, bloqueante) => items.push({ codigo, ok, mensaje, bloqueante }),
    ).catch(() => undefined); // el adaptador real no se evalúa aquí; solo el chequeo de resolución
    return items.find((i) => i.codigo === "resolucion_sii");
  }

  it("preflight: resolución 0 pasa en certificación", async () => {
    expect(await resolucion("certificacion", 0)).toMatchObject({ ok: true, bloqueante: false });
  });
  it("preflight: resolución 0 bloquea en producción", async () => {
    expect(await resolucion("produccion", 0)).toMatchObject({ ok: false, bloqueante: true });
  });
  it("preflight: en producción un número mayor que 0 pasa", async () => {
    expect(await resolucion("produccion", 80)).toMatchObject({ ok: true });
  });
  it("preflight: sin número sigue bloqueando", async () => {
    expect(await resolucion("certificacion", null)).toMatchObject({ ok: false, bloqueante: true });
  });
});
