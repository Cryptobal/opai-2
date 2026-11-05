import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dteConfigActualizar } from "../src/finanzas/dte-config";
import type { Contexto } from "../src/types";

function ctx(partial: Pick<Contexto, "actor" | "rol">): Contexto {
  return {
    actor: partial.actor,
    rol: partial.rol,
    db: { dteConfig: { findUnique: async () => null } },
  } as unknown as Contexto;
}

const HABILITADA = { OPAI_PRODUCCION_TRIBUTARIA: "habilitada", BETTER_AUTH_URL: "https://app.opai.cl" };

describe("Finanzas · dte_config (CAR-140, C3)", () => {
  beforeEach(() => {
    for (const [k, v] of Object.entries(HABILITADA)) vi.stubEnv(k, v);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("agente owner y admin humano reciben FORBIDDEN; owner humano puede previsualizar", async () => {
    const input = { ambiente: "produccion" as const, rutEmisor: "76111222-8" };
    await expect(
      dteConfigActualizar.handler(
        ctx({ actor: { tipo: "agent", id: "k", viaUserId: "u" }, rol: "owner" }),
        input,
        { dryRun: true },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      dteConfigActualizar.handler(
        ctx({ actor: { tipo: "user", id: "u" }, rol: "admin" }),
        input,
        { dryRun: true },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const preview = await dteConfigActualizar.handler(
      ctx({ actor: { tipo: "user", id: "u" }, rol: "owner" }),
      input,
      { dryRun: true },
    );
    expect(preview.ambiente).toBe("produccion");
  });
});

describe("Finanzas · dte_config · candado de ambiente (CAR-191)", () => {
  afterEach(() => vi.unstubAllEnvs());
  const owner = () => ctx({ actor: { tipo: "user", id: "u" }, rol: "owner" });
  const input = { ambiente: "produccion" as const, rutEmisor: "76111222-8" };

  it("rechaza pasar a producción fuera de app.opai.cl, también en vista previa", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://test.opai.cl");
    vi.stubEnv("OPAI_PRODUCCION_TRIBUTARIA", "habilitada");
    for (const dryRun of [true, false]) {
      await expect(dteConfigActualizar.handler(owner(), input, { dryRun })).rejects.toThrow(
        "La producción del SII solo está disponible en app.opai.cl",
      );
    }
  });

  it("rechaza producción si falta la variable aunque el host sea app.opai.cl", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://app.opai.cl");
    vi.stubEnv("OPAI_PRODUCCION_TRIBUTARIA", "");
    await expect(dteConfigActualizar.handler(owner(), input, { dryRun: true })).rejects.toThrow("app.opai.cl");
  });

  it("certificación siempre se puede guardar", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://test.opai.cl");
    const r = await dteConfigActualizar.handler(owner(), { ambiente: "certificacion" }, { dryRun: true });
    expect(r.ambiente).toBe("certificacion");
  });
});
