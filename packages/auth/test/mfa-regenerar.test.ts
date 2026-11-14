import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "better-auth/api";

const estado = vi.hoisted(() => ({ generar: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: "sesion=test" }) }));
vi.mock("../src/auth", () => ({ auth: { api: { generateBackupCodes: estado.generar } } }));

import { regenerarCodigosRespaldo } from "../src/mfa";

describe("regenerar códigos de respaldo", () => {
  beforeEach(() => {
    estado.generar.mockReset();
  });

  it("envía la contraseña y la sesión y devuelve los códigos nuevos", async () => {
    estado.generar.mockResolvedValue({ backupCodes: ["nuevo-1", "nuevo-2"] });
    expect(await regenerarCodigosRespaldo("clave")).toEqual({
      ok: true,
      codigos: ["nuevo-1", "nuevo-2"],
    });
    expect(estado.generar).toHaveBeenCalledWith({
      body: { password: "clave" },
      headers: new Headers({ cookie: "sesion=test" }),
    });
  });

  it("propaga un fallo inesperado sin presentarlo como éxito", async () => {
    estado.generar.mockRejectedValue(new Error("fallo inesperado"));
    await expect(regenerarCodigosRespaldo("clave")).rejects.toThrow("fallo inesperado");
  });

  it("rechaza una contraseña incorrecta sin entregar códigos", async () => {
    estado.generar.mockRejectedValue(new APIError("BAD_REQUEST", { code: "INVALID_PASSWORD" }));
    expect(await regenerarCodigosRespaldo("incorrecta")).toEqual({
      ok: false,
      mensaje: "La contraseña no es correcta.",
    });
  });
});
