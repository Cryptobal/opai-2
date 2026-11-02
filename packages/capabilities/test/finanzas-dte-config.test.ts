import { describe, expect, it } from "vitest";

import { dteConfigActualizar } from "../src/finanzas/dte-config";
import type { Contexto } from "../src/types";

function ctx(partial: Pick<Contexto, "actor" | "rol">): Contexto {
  return {
    actor: partial.actor,
    rol: partial.rol,
    db: { dteConfig: { findUnique: async () => null } },
  } as unknown as Contexto;
}

describe("Finanzas · dte_config (CAR-140, C3)", () => {
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
