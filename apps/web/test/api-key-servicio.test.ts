import { describe, expect, it, vi } from "vitest";

import { fuentesFalsas } from "./fuentes-falsas";

vi.mock("../lib/medidor", () => ({
  medidorDiferido: { registrar: vi.fn() },
  diferirConAfter: vi.fn(),
  despacharDiferido: () => vi.fn(),
}));

describe("principal de la API key", () => {
  it("servicio no hereda el rol owner ni sus excepciones", async () => {
    const { contextoDeApiKey } = await import("../lib/api-key");
    const { fuentes, secreto } = fuentesFalsas({
      key: {
        principalTipo: "servicio",
        heredaPermisos: false,
        permisos: ["core:cuentas.read"],
        presupuestoMensualMicro: 1_000_000n,
      },
    });
    const ctx = await contextoDeApiKey(secreto, fuentes);
    if (ctx instanceof Response) throw new Error("No autenticado");
    expect(ctx.rol).toBe(null);
    expect(ctx.principal).toEqual({ tipo: "servicio", id: "k1" });
    expect(ctx.autorizar("core:cuentas.read")).toBe(true);
    expect(ctx.autorizar("core:cuentas.manage")).toBe(false);
  });
  it("la key delegada conserva alcance y cruza permisos con excepciones del responsable", async () => {
    const { contextoDeApiKey } = await import("../lib/api-key");
    const { fuentes, secreto } = fuentesFalsas({
      key: { heredaPermisos: false, permisos: ["core:cuentas.read", "core:cuentas.manage"] },
      acceso: {
        permisosRol: null,
        excepciones: [{ permiso: "core:cuentas.manage", conceder: false }],
        instalaciones: ["i1"],
      },
    });
    const ctx = await contextoDeApiKey(secreto, fuentes);
    if (ctx instanceof Response) throw new Error("No autenticado");
    expect(ctx.alcance).toEqual({ instalaciones: ["i1"] });
    expect(ctx.autorizar("core:cuentas.read")).toBe(true);
    expect(ctx.autorizar("core:cuentas.manage")).toBe(false);
    expect(ctx.autorizar("core:users.read")).toBe(false);
  });
});
