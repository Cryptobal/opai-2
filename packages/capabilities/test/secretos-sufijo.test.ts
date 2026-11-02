import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

import { guardarSecreto, insertarSecretoConIdTx } from "../src/integraciones/secretos";
import { contextoDePrueba } from "../src/testing";

beforeAll(() => {
  process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
});

describe("secretos · sufijo de retorno (C1)", () => {
  it('guardarSecreto devuelve sufijo vacío para nombre "clave"', async () => {
    const { ctx } = contextoDePrueba();
    const fila = await ctx.db.integracion.upsert({
      where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: "dte_cesion" } },
      create: {
        tenantId: ctx.tenantId,
        proveedor: "dte_cesion",
        modalidad: "propia",
        estado: "configurada",
      },
      update: {},
    });
    const valor = "octava-clave-secreta-1234";
    const r = await guardarSecreto(ctx, fila.id, "clave", valor);
    expect(r.sufijo).toBe("");
    expect(r.sufijo).not.toBe(valor.slice(-4));
  });

  it("insertarSecretoConIdTx sigue devolviendo sufijo para nombres CAF (no son contraseña)", async () => {
    const { ctx } = contextoDePrueba();
    const fila = await ctx.db.integracion.upsert({
      where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: "dte_emision" } },
      create: {
        tenantId: ctx.tenantId,
        proveedor: "dte_emision",
        modalidad: "propia",
        estado: "configurada",
      },
      update: {},
    });
    const cafXml = "<CAF version='1.0'>contenido-xml-caf</CAF>";
    let out = { id: "", sufijo: "" };
    await ctx.transaccion(async (tx) => {
      out = await insertarSecretoConIdTx(tx, ctx, fila.id, "caf_33_idk_1_100", cafXml);
    });
    expect(out.sufijo).toBe(cafXml.slice(-4));
  });
});
