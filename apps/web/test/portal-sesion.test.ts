import { beforeAll, describe, expect, it, vi } from "vitest";

import { denegar } from "../../../packages/capabilities/src/autorizacion";
import { capacidadesDelNucleo } from "@opai/capabilities";
import type * as ActorMod from "../lib/actor";
import { fuentesFalsas, membresia, TENANT, USUARIO } from "./fuentes-falsas";

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
let actor: typeof ActorMod;
beforeAll(async () => {
  actor = await import("../lib/actor");
});

describe("portales del Contexto de sesión", () => {
  it("usa solo la membresía actual, no la unión con las otras, sin lecturas adicionales", async () => {
    const otroId = "0192f3a0-0000-7000-8000-000000000002";
    const otro = membresia({ tenantId: otroId, portales: ["erp"] });
    const { fuentes } = fuentesFalsas({
      membresias: [membresia({ rol: "supervisor", portales: ["supervisor"] }), otro],
    });
    const cargar = vi.spyOn(fuentes, "membresiasDe");
    const identidad = await actor.identidadDe(USUARIO, TENANT, fuentes);
    const buscar = capacidadesDelNucleo.find((c) => c.id === "core.buscar")!;
    for (const portal of ["erp", "supervisor", "inventado", null]) {
      const ctx = actor.contextoDeIdentidad(identidad, portal);
      expect(ctx.portalesMembresia).toEqual(["supervisor"]);
      expect(denegar(ctx, buscar)).toMatchObject({ error: { code: "FORBIDDEN" } });
    }
    expect(cargar).toHaveBeenCalledOnce();
    const erp = actor.contextoDeIdentidad(await actor.identidadDe(USUARIO, otroId, fuentes), "erp");
    expect(denegar(erp, buscar)).toBeNull();
  });

  it("API con sesión no confía en portal de cabecera, query ni body: null se rechaza", async () => {
    const req = new Request("http://x/api/v1/core/buscar?portal=erp", {
      method: "POST",
      headers: { "x-opai-portal": "erp" },
      body: JSON.stringify({ portal: "erp" }),
    });
    const ctx = await actor.resolverActor(req, fuentesFalsas().fuentes, async () => ({
      user: { ...USUARIO, twoFactorEnabled: true },
      session: { mfaVerified: true },
    }));
    if (ctx instanceof Response) throw new Error("Se esperaba sesión");
    expect(ctx.portal).toBeNull();
    expect(
      denegar(
        ctx,
        capacidadesDelNucleo.find((c) => c.id === "core.buscar")!,
      ),
    ).toMatchObject({
      error: { code: "FORBIDDEN", message: "No tienes acceso a este portal." },
    });
  });
});
