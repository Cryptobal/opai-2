import { describe, expect, it } from "vitest";

import { emitirComprobante, slugDeComprobante } from "../src";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";

describe("comprobantes verificables", () => {
  it("emite un token con el slug del tenant y lo guarda sin datos personales", async () => {
    const { ctx, tabla } = contextoDePrueba({
      semilla: { tenant: [{ id: TENANT_DE_PRUEBA, slug: "gard", nombre: "Gard" }] },
    });
    const { token, url } = await ctx.transaccion(async (tx) => {
      const { seq, hash } = await ctx.bitacora.registrar(tx, {
        tipo: "documento.registrado",
        payload: {},
      });
      return emitirComprobante(ctx, tx, {
        tipo: "documento.registrado",
        entidadTipo: "documento",
        entidadId: "d1",
        hash,
        bitacoraSeq: seq,
      });
    });
    expect(slugDeComprobante(token)).toBe("gard");
    expect(url).toBe(`https://test.opai.cl/verificar/${token}`);
    expect(tabla("comprobante")[0]).toMatchObject({ token, bitacoraSeq: 1, emitidoA: null });
    expect(tabla("comprobante")[0]?.["hash"]).toBe(tabla("bitacora")[0]?.["hash"]);
  });

  it("rechaza tokens mal formados", () => {
    expect(slugDeComprobante("sin-punto")).toBeNull();
    expect(slugDeComprobante("gard.corto")).toBeNull();
  });
});
