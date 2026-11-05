import { describe, expect, it, vi } from "vitest";

import { restriccion } from "@opai/capabilities";

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
vi.mock("../lib/medidor", () => ({
  medidorDiferido: { registrar: vi.fn() },
  diferirConAfter: vi.fn(),
  despacharDiferido: () => vi.fn(),
}));

import type { Identidad } from "../lib/actor";
import { identidadCpq } from "./cpq-fixtures";

/** CAR-188: el contexto de una sesión lleva los módulos en solo lectura y `restriccion` los frena. */
describe("módulo en solo lectura en el contexto de la sesión", () => {
  it("la pantalla (sesión) rechaza escribir en el módulo y deja leer", async () => {
    const { contextoDeIdentidad } = await import("../lib/actor");
    const identidad: Identidad = {
      ...identidadCpq(),
      modulosActivos: ["comercial"],
      modulosSoloLectura: ["comercial"],
    };
    const ctx = contextoDeIdentidad(identidad, "erp");
    expect(ctx.modulosSoloLectura).toEqual(["comercial"]);
    const cap = (efecto: string) => ({ id: "comercial.x", modulo: "comercial", efecto }) as never;
    expect(restriccion(ctx, cap("lectura"))).toBeNull();
    expect(restriccion(ctx, cap("escritura"))).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(restriccion(ctx, cap("irreversible"))).toMatchObject({ ok: false });
  });
});
