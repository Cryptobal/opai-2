import { describe, expect, it, vi } from "vitest";

import { denegar } from "../../../packages/capabilities/src/autorizacion";
import { capacidadesDelNucleo } from "@opai/capabilities";
import { contextoDeIdentidad, identidadDe, resolverActor } from "../lib/actor";
import { fuentesFalsas, membresia, TENANT, USUARIO } from "./fuentes-falsas";

describe("portales del Contexto de sesión", () => {
  it("usa solo la membresía actual, no la unión con las otras, sin lecturas adicionales", async () => {
    const otroId = "0192f3a0-0000-7000-8000-000000000002";
    const otro = membresia({ tenantId: otroId, portales: ["erp"] });
    const { fuentes } = fuentesFalsas({
      membresias: [membresia({ rol: "supervisor", portales: ["supervisor"] }), otro],
    });
    const cargar = vi.spyOn(fuentes, "membresiasDe");
    const identidad = await identidadDe(USUARIO, TENANT, fuentes);
    const buscar = capacidadesDelNucleo.find((c) => c.id === "core.buscar")!;
    for (const portal of ["erp", "supervisor", "inventado", null]) {
      const ctx = contextoDeIdentidad(identidad, portal);
      expect(ctx.portalesMembresia).toEqual(["supervisor"]);
      expect(denegar(ctx, buscar)).toMatchObject({ error: { code: "FORBIDDEN" } });
    }
    expect(cargar).toHaveBeenCalledOnce();
    const erp = contextoDeIdentidad(await identidadDe(USUARIO, otroId, fuentes), "erp");
    expect(denegar(erp, buscar)).toBeNull();
  });

  it("API con sesión no confía en portal de cabecera, query ni body: null se rechaza", async () => {
    const req = new Request("http://x/api/v1/core/buscar?portal=erp", {
      method: "POST",
      headers: { "x-opai-portal": "erp" },
      body: JSON.stringify({ portal: "erp" }),
    });
    const ctx = await resolverActor(req, fuentesFalsas().fuentes, async () => ({ user: USUARIO }));
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
