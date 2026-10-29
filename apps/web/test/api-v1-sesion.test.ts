import { beforeAll, describe, expect, it, vi } from "vitest";

import { capacidadesDelNucleo } from "@opai/capabilities";

import { denegar } from "../../../packages/capabilities/src/autorizacion";
import type * as ActorMod from "../lib/actor";
import { CAPACIDADES_V1_SESION_ERP, contextoV1Sesion } from "../lib/api-v1-sesion";
import { fuentesFalsas, membresia, USUARIO } from "./fuentes-falsas";

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
let actor: typeof ActorMod;
beforeAll(async () => {
  actor = await import("../lib/actor");
});

const capacidad = (id: string) => capacidadesDelNucleo.find((c) => c.id === id)!;
const URL_V1 = "http://localhost:3000/api/v1/core/roles/create";
const MISMO = { origin: "http://localhost:3000" };
const req = (init: RequestInit = {}) =>
  new Request(URL_V1, { ...init, headers: { ...MISMO, ...init.headers } });

async function sesion(membresias = [membresia()]) {
  const ctx = await actor.resolverActor(
    new Request(URL_V1, { method: "POST" }),
    fuentesFalsas({ membresias }).fuentes,
    async () => ({ user: { ...USUARIO, twoFactorEnabled: true }, session: { mfaVerified: true } }),
  );
  if (ctx instanceof Response) throw new Error("Se esperaba sesión");
  return ctx;
}

describe("/api/v1 con sesión: roles y permisos en el portal ERP fijado en servidor (CAR-37)", () => {
  it("las capacidades de la lista corren en ERP y pasan la autorización de un owner", async () => {
    const ctx = contextoV1Sesion(await sesion(), "core.roles.create", req());
    if (ctx instanceof Response) throw new Error("Se esperaba contexto");
    expect(ctx.portal).toBe("erp");
    for (const id of CAPACIDADES_V1_SESION_ERP) expect(denegar(ctx, capacidad(id)), id).toBeNull();
  });

  it("fuera de la lista el portal sigue nulo y la capacidad del tenant se rechaza", async () => {
    const ctx = contextoV1Sesion(await sesion(), "core.buscar", req());
    if (ctx instanceof Response) throw new Error("Se esperaba contexto");
    expect(ctx.portal).toBeNull();
    expect(denegar(ctx, capacidad("core.buscar"))).toMatchObject({ error: { code: "FORBIDDEN" } });
  });

  it("sin el ERP en la membresía no se fija el portal", async () => {
    const ctx = contextoV1Sesion(
      await sesion([membresia({ portales: ["supervisor"] })]),
      "core.roles.list",
      req(),
    );
    if (ctx instanceof Response) throw new Error("Se esperaba contexto");
    expect(ctx.portal).toBeNull();
    expect(denegar(ctx, capacidad("core.roles.list"))).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  });

  it("con cookie desde otro sitio, o sin señales de origen, se corta (CSRF), también en GET", async () => {
    const base = await sesion();
    const cortes: Record<string, string>[] = [
      { origin: "https://malo.example" },
      { "sec-fetch-site": "cross-site" },
      {},
    ];
    for (const method of ["POST", "GET"]) {
      for (const headers of cortes) {
        const r = contextoV1Sesion(
          base,
          "core.roles.list",
          new Request(URL_V1, { method, headers }),
        );
        expect(r, `${method} ${JSON.stringify(headers)}`).toBeInstanceOf(Response);
        expect((r as Response).status).toBe(403);
      }
    }
    for (const headers of [MISMO, { "sec-fetch-site": "same-origin" }]) {
      const r = contextoV1Sesion(
        base,
        "core.roles.create",
        new Request(URL_V1, { method: "POST", headers }),
      );
      expect(r).not.toBeInstanceOf(Response);
    }
  });

  it("una API key no cambia: las soloPersonas siguen bloqueadas para agentes", async () => {
    const { fuentes, secreto } = fuentesFalsas();
    const key = await actor.resolverActor(
      new Request(URL_V1, { headers: { authorization: `Bearer ${secreto}` } }),
      fuentes,
    );
    if (key instanceof Response) throw new Error("Se esperaba key");
    const ctx = contextoV1Sesion(key, "core.roles.create", new Request(URL_V1));
    expect(ctx).toBe(key);
    for (const id of ["core.roles.create", "core.excepciones.set", "core.roles.assign"]) {
      expect(denegar(key, capacidad(id)), id).toMatchObject({
        error: { code: "FORBIDDEN", message: "Solo una persona puede hacer esto, no una API key." },
      });
    }
  });
});
