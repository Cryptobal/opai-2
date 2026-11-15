// CAR-359: una key delegada (hereda permisos) suma los roles adicionales de su responsable; una key de
// servicio no los recibe como propios, pero sí la acotan como techo del responsable.
import { describe, expect, it, vi } from "vitest";

import { fuentesFalsas, membresia } from "./fuentes-falsas";

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");

vi.mock("../lib/medidor", () => ({
  medidorDiferido: { registrar: vi.fn() },
  diferirConAfter: vi.fn(),
  despacharDiferido: () => vi.fn(),
}));

const acceso = {
  permisosRol: null,
  excepciones: [],
  instalaciones: null,
  permisosAdicionales: ["core:cuentas.manage"],
};

describe("roles adicionales en la API key (CAR-359)", () => {
  it("la key delegada hereda los roles adicionales del responsable", async () => {
    const { contextoDeApiKey } = await import("../lib/api-key");
    const { fuentes, secreto } = fuentesFalsas({
      membresias: [membresia({ rol: "viewer" })],
      key: { principalTipo: "usuario", heredaPermisos: true, permisos: [] },
      acceso,
    });
    const ctx = await contextoDeApiKey(secreto, fuentes);
    if (ctx instanceof Response) throw new Error("No autenticado");
    expect(ctx.autorizar("core:cuentas.manage")).toBe(true);
  });

  it("la key de servicio no los recibe como propios: solo lo que lista", async () => {
    const { contextoDeApiKey } = await import("../lib/api-key");
    const { fuentes, secreto } = fuentesFalsas({
      membresias: [membresia({ rol: "viewer" })],
      key: {
        principalTipo: "servicio",
        heredaPermisos: false,
        permisos: ["core:cuentas.read"],
        presupuestoMensualMicro: 1_000_000n,
      },
      acceso,
    });
    const ctx = await contextoDeApiKey(secreto, fuentes);
    if (ctx instanceof Response) throw new Error("No autenticado");
    expect(ctx.autorizar("core:cuentas.manage")).toBe(false);
    expect(ctx.autorizar("core:cuentas.read")).toBe(true);
  });
});
