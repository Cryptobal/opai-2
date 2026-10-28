import { beforeAll, describe, expect, it, vi } from "vitest";

import { capacidadesDelNucleo } from "@opai/capabilities";

import { denegar } from "../../../packages/capabilities/src/autorizacion";
import { contextoSesionApi } from "../lib/api-sesion";
import type * as ActorMod from "../lib/actor";
import { fuentesFalsas, membresia, TENANT, USUARIO } from "./fuentes-falsas";

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
let actor: typeof ActorMod;
beforeAll(async () => {
  actor = await import("../lib/actor");
});

const asignar = capacidadesDelNucleo.find((c) => c.id === "core.supervisores.asignar")!;
const URL_API = "http://x/api/v1/core/supervisores/asignar";

async function ctxSesion(portales: string[]) {
  const { fuentes } = fuentesFalsas({ membresias: [membresia({ rol: "admin", portales })] });
  return actor.contextoDeIdentidad(await actor.identidadDe(USUARIO, TENANT, fuentes), null);
}

describe("/api/v1 con sesión (CAR-38)", () => {
  it("con ERP en la membresía y el propio origen fija el portal erp en servidor", async () => {
    const ctx = contextoSesionApi(
      new Request(`${URL_API}?portal=supervisor`, {
        method: "POST",
        headers: { origin: "http://x", "x-opai-portal": "supervisor" },
      }),
      await ctxSesion(["erp"]),
    );
    if (ctx instanceof Response) throw new Error("Se esperaba contexto");
    expect(ctx.portal).toBe("erp");
    expect(denegar(ctx, asignar)).toBeNull();
  });

  it("un POST de otro origen o sin Origin se rechaza: la cookie sola no basta", async () => {
    for (const headers of [{ origin: "https://malo.cl" }, {}]) {
      const r = contextoSesionApi(
        new Request(URL_API, { method: "POST", headers }),
        await ctxSesion(["erp"]),
      );
      expect(r).toBeInstanceOf(Response);
      expect((r as Response).status).toBe(403);
    }
  });

  it("sin ERP ni tenant también exige el propio origen (plataforma y sin tenant)", async () => {
    const { fuentes } = fuentesFalsas({ membresias: [] });
    const sinTenant = actor.contextoDeIdentidad(
      await actor.identidadDe(USUARIO, undefined, fuentes),
      null,
    );
    for (const ctx of [sinTenant, await ctxSesion(["supervisor"])]) {
      const r = contextoSesionApi(new Request(URL_API, { method: "POST" }), ctx);
      expect((r as Response).status).toBe(403);
    }
  });

  it("un GET desde otro sitio se rechaza; sin cabeceras de navegador pasa", async () => {
    const ajeno = contextoSesionApi(
      new Request(URL_API, { headers: { "sec-fetch-site": "cross-site" } }),
      await ctxSesion(["erp"]),
    );
    expect((ajeno as Response).status).toBe(403);
    const cli = contextoSesionApi(new Request(URL_API), await ctxSesion(["erp"]));
    expect(cli).not.toBeInstanceOf(Response);
  });

  it("sin ERP en la membresía conserva portal null y la capacidad se deniega como antes", async () => {
    const ctx = contextoSesionApi(
      new Request(URL_API, { method: "POST", headers: { origin: "http://x" } }),
      await ctxSesion(["supervisor"]),
    );
    if (ctx instanceof Response) throw new Error("Se esperaba contexto");
    expect(ctx.portal).toBeNull();
    expect(denegar(ctx, asignar)).toMatchObject({
      error: { code: "FORBIDDEN", message: "No tienes acceso a este portal." },
    });
  });
});
