import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba } from "../src/testing";
import { semillaTenant } from "./semilla";

// CAR-351 (Estándares P-3): una llave nueva nace con lo mínimo.
const DIA = 86_400_000;
const crear = (input: Record<string, unknown>, rol: "owner" | "admin" = "owner") => {
  const { ctx, tabla } = contextoDePrueba({ rol, semilla: semillaTenant() });
  return executeCapability(ctx, "core.apikeys.create", { nombre: "Agente", scopes: ["core"], ...input }).then(
    (r) => ({ r, keys: tabla("apiKey") }),
  );
};

describe("política de llaves nuevas (CAR-351)", () => {
  beforeEach(() => {
    limpiarRegistro();
    registrarCapacidades(capacidadesDelNucleo);
  });

  it("sin permisos elegidos ni herencia explícita, no se crea", async () => {
    const { r, keys } = await crear({});
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(keys).toHaveLength(0);
  });

  it("no acepta permisos y herencia a la vez", async () => {
    const { r } = await crear({ permisos: ["core:cuentas.read"], heredarPermisos: true });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("toda llave nueva vence: por defecto a 90 días", async () => {
    const { r, keys } = await crear({ permisos: ["core:cuentas.read"] });
    expect(r.ok).toBe(true);
    const vence = (keys[0] as { expiraEn: Date }).expiraEn.getTime();
    expect(Math.abs(vence - (Date.now() + 90 * DIA))).toBeLessThan(60_000);
  });

  it("rechaza un vencimiento más allá del máximo de la empresa", async () => {
    const lejos = new Date(Date.now() + 400 * DIA).toISOString();
    const { r } = await crear({ heredarPermisos: true, expiraEn: lejos });
    expect(r).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it('en producción, el scope "*" solo lo crea un owner', async () => {
    const antes = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const admin = await crear({ scopes: ["*"], heredarPermisos: true }, "admin");
      expect(admin.r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      const owner = await crear({ scopes: ["*"], heredarPermisos: true }, "owner");
      expect(owner.r.ok).toBe(true);
    } finally {
      process.env.NODE_ENV = antes;
    }
  });
});
