import { beforeAll, describe, expect, it, vi } from "vitest";

import type * as HttpMod from "@opai/capabilities/http";

import type * as RutaMod from "../app/api/v1/[...capability]/route";
import type * as ActorMod from "../lib/actor";
import { fuentesFalsas, USUARIO } from "./fuentes-falsas";

// El rate limit central usa la base; aquí se simula (siempre permite) para probar solo la autenticación.
vi.mock("@/lib/rate-limit", () => ({
  permitir: async () => true,
  ipDe: () => "1.2.3.4",
  LIMITES: {
    apiPorPrincipal: { maximo: 120, ventanaMs: 60_000 },
    apiPorIp: { maximo: 240, ventanaMs: 60_000 },
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
vi.stubEnv("BETTER_AUTH_SECRET", "secreto-de-prueba-de-al-menos-32-caracteres");
let ruta: typeof RutaMod;
let http: typeof HttpMod;
let actor: typeof ActorMod;

beforeAll(async () => {
  ruta = await import("../app/api/v1/[...capability]/route");
  http = await import("@opai/capabilities/http");
  actor = await import("../lib/actor");
});

const params = (capability: string[]) => ({ params: Promise.resolve({ capability }) });

describe("/api/v1/core/me", () => {
  it("sin sesión ni key: 401", async () => {
    const res = await ruta.GET(
      new Request("http://localhost:3000/api/v1/core/me"),
      params(["core", "me"]),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("key mal formada: 401", async () => {
    const req = new Request("http://localhost:3000/api/v1/core/me", {
      headers: { authorization: "Bearer nada" },
    });
    expect((await ruta.GET(req, params(["core", "me"]))).status).toBe(401);
  });

  it("con sesión (sin empresa elegida): 200 con el usuario", async () => {
    const { fuentes } = fuentesFalsas({ membresias: [] });
    const fabrica = (req: Request) =>
      actor.resolverActor(req, fuentes, async () => ({ user: USUARIO }));
    const res = await http.manejarCapacidadHttp(
      new Request("http://x/api/v1/core/me"),
      ["core", "me"],
      fabrica,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      data: { usuario: { email: USUARIO.email }, tenant: null, actor: { tipo: "user" } },
    });
  });

  it("una capacidad que exige empresa responde 403 sin tenant actual", async () => {
    const { fuentes } = fuentesFalsas({ membresias: [] });
    const fabrica = (req: Request) =>
      actor.resolverActor(req, fuentes, async () => ({ user: USUARIO }));
    const res = await http.manejarCapacidadHttp(
      new Request("http://x"),
      ["core", "users", "list"],
      fabrica,
    );
    expect(res.status).toBe(403);
  });
});
