import { contextoDePrueba } from "@opai/capabilities/testing";
import { describe, expect, it } from "vitest";

import { ACTIVOS, CON_COSTOS, GESTOR, semilla } from "../capabilities/fixtures";
import { margenesConfigurados, margenesTenant } from "./supuestos";

function entorno() {
  return contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, permisos: [...GESTOR, ...CON_COSTOS] }).ctx;
}

async function guardar(ctx: ReturnType<typeof entorno>, clave: string, valor: unknown) {
  await ctx.db.ajuste.create({
    data: { tenantId: ctx.tenantId, modulo: "cpq", clave, ambito: "tenant", sujetoId: ctx.tenantId, valor: valor as never },
  });
}

describe("márgenes configurados por la empresa (CAR-192 N3)", () => {
  it("sin ajuste (origen «defecto») el mínimo es null, pero el motor conserva el 10 %", async () => {
    const ctx = entorno();
    expect(await margenesConfigurados(ctx)).toEqual({ minimoPct: null, alertaPct: null });
    expect((await margenesTenant(ctx)).minimoPct).toBe(100_000);
  });

  it("un valor guardado que no pasa el esquema cae al defecto y tampoco cuenta como configurado", async () => {
    const ctx = entorno();
    await guardar(ctx, "margen_minimo_pct", "no es un número");
    expect((await margenesConfigurados(ctx)).minimoPct).toBeNull();
  });

  it("un valor guardado por la empresa cuenta como configurado, aunque coincida con el defecto", async () => {
    const ctx = entorno();
    await guardar(ctx, "margen_minimo_pct", 10);
    expect((await margenesConfigurados(ctx)).minimoPct).toBe(100_000);
  });
});
