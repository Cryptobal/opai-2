import { afterEach, describe, expect, it, vi } from "vitest";

import { adaptadorSimpleApi } from "./simpleapi";

describe("SimpleAPI consultar (CAR-140)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("mapea aceptado, rechazado, reparo y pendiente; desconocido queda pendiente", async () => {
    const api = adaptadorSimpleApi({ apiKey: "k", certificadoPfx: "p", certificadoClave: "c" });
    const consultar = async (estado?: string) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          json: async () => ({ estado }),
        })) as unknown as typeof fetch,
      );
      return api.consultar("TRK", "certificacion");
    };
    expect((await consultar("aceptado")).estado).toBe("aceptado");
    expect((await consultar("rechazado")).estado).toBe("rechazado");
    expect((await consultar("reparo")).estado).toBe("reparo");
    expect((await consultar("aceptado con reparos")).estado).toBe("reparo");
    expect((await consultar("pendiente")).estado).toBe("pendiente");
    expect((await consultar("en_proceso")).estado).toBe("pendiente");
  });
});
