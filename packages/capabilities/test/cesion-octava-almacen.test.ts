import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

import { almacenSesionOctava } from "../src/finanzas/adaptador-cesion-octava";
import { guardarSecreto } from "../src/integraciones/secretos";
import { contextoDePrueba } from "../src/testing";

beforeAll(() => {
  process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
});

async function integracionCesion() {
  const { ctx } = contextoDePrueba();
  const fila = await ctx.db.integracion.upsert({
    where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: "dte_cesion" } },
    create: { tenantId: ctx.tenantId, proveedor: "dte_cesion", modalidad: "propia", estado: "configurada" },
    update: {},
  });
  return { ctx, id: fila.id };
}

describe("almacén de sesión Octava (CAR-154)", () => {
  it("guarda y lee el token cifrado; token nulo se lee como ausente", async () => {
    const { ctx, id } = await integracionCesion();
    const a = almacenSesionOctava(ctx, id);
    expect(await a.leerToken()).toBeNull();
    await a.guardarToken({ token: "tok|con|barras", expiraEn: 123456 });
    expect(await a.leerToken()).toEqual({ token: "tok|con|barras", expiraEn: 123456 });
    await a.guardarToken(null);
    expect(await a.leerToken()).toBeNull();
  });

  it("no persiste sufijo del token (no se filtran por máscara)", async () => {
    const { ctx, id } = await integracionCesion();
    expect((await guardarSecreto(ctx, id, "token_sesion", "1|TOKEN-WXYZ")).sufijo).toBe("");
  });
});
