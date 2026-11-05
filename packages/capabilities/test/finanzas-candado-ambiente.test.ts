import { afterEach, describe, expect, it, vi } from "vitest";

const octava = vi.hoisted(() => vi.fn());
vi.mock("@opai/integrations", async (original) => ({
  ...(await original<typeof import("@opai/integrations")>()),
  adaptadorOctava: octava,
}));

import { adaptadorCesionDe } from "../src/finanzas/adaptador-cesion";
import { ambienteDe } from "../src/finanzas/ventas-comun";
import type { Contexto } from "../src/types";

/** Empresa que guardó «producción» en su configuración DTE. */
function ctxProduccionGuardada(): Contexto {
  return {
    tenantId: "t1",
    db: {
      dteConfig: {
        findUnique: async () => ({ ambiente: "produccion", cesionProveedor: "octava", rutEmisor: "76111222-8" }),
      },
      integracion: { findUnique: async () => null },
      tenant: { findUnique: async () => ({ nombre: "Empresa", rut: null }) },
    },
  } as unknown as Contexto;
}

describe("Candado de ambiente tributario (CAR-191)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    octava.mockReset();
  });

  it("ambienteDe: «produccion» guardado y sin habilitar rinde certificación", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://test.opai.cl");
    vi.stubEnv("OPAI_PRODUCCION_TRIBUTARIA", "habilitada");
    expect(await ambienteDe(ctxProduccionGuardada())).toBe("certificacion");
  });

  it("ambienteDe: con app.opai.cl y la variable, respeta producción", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://app.opai.cl");
    vi.stubEnv("OPAI_PRODUCCION_TRIBUTARIA", "habilitada");
    expect(await ambienteDe(ctxProduccionGuardada())).toBe("produccion");
  });

  it("adaptadorCesionDe: Octava recibe «certificacion» con producción guardada sin habilitar", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CESION_ADAPTADOR", "");
    vi.stubEnv("BETTER_AUTH_URL", "https://test.opai.cl");
    vi.stubEnv("OPAI_PRODUCCION_TRIBUTARIA", "");
    octava.mockReturnValue({ proveedor: "octava" });
    await adaptadorCesionDe(ctxProduccionGuardada());
    expect(octava).toHaveBeenCalledWith(expect.objectContaining({ ambiente: "certificacion" }));
  });

  it("adaptadorCesionDe: Octava recibe «produccion» solo cuando está habilitada", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CESION_ADAPTADOR", "");
    vi.stubEnv("BETTER_AUTH_URL", "https://app.opai.cl");
    vi.stubEnv("OPAI_PRODUCCION_TRIBUTARIA", "habilitada");
    octava.mockReturnValue({ proveedor: "octava" });
    await adaptadorCesionDe(ctxProduccionGuardada());
    expect(octava).toHaveBeenCalledWith(expect.objectContaining({ ambiente: "produccion" }));
  });
});
