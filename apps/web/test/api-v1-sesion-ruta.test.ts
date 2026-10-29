import { beforeAll, describe, expect, it, vi } from "vitest";

import type * as RutaMod from "../app/api/v1/[...capability]/route";
import type * as ActorMod from "../lib/actor";
import { fuentesFalsas, USUARIO } from "./fuentes-falsas";

// La ruta real de /api/v1 usa `contextoV1Sesion` (CAR-37): una sesión con cookie desde otro sitio
// se corta antes de la capacidad. Rate limit simulado; la sesión sale de fuentes en memoria.
vi.mock("@/lib/rate-limit", () => ({
  permitir: async () => true,
  ipDe: () => "1.2.3.4",
  LIMITES: { apiPorPrincipal: { maximo: 120 }, apiPorIp: { maximo: 240 } },
}));
vi.mock("@/lib/actor", async (original) => {
  const real = await original<typeof ActorMod>();
  return {
    ...real,
    resolverActor: (req: Request) =>
      real.resolverActor(req, fuentesFalsas().fuentes, async () => ({
        user: { ...USUARIO, twoFactorEnabled: true },
        session: { mfaVerified: true },
      })),
  };
});

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
let ruta: typeof RutaMod;
beforeAll(async () => {
  ruta = await import("../app/api/v1/[...capability]/route");
});

const params = (capability: string[]) => ({ params: Promise.resolve({ capability }) });

describe("/api/v1 con sesión: cableado de la ruta (CAR-37)", () => {
  it("una lectura de roles desde otro sitio responde 403 «Origen no permitido»", async () => {
    const res = await ruta.GET(
      new Request("http://localhost:3000/api/v1/core/roles/list", {
        headers: { "sec-fetch-site": "cross-site" },
      }),
      params(["core", "roles", "list"]),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: { message: "Origen no permitido." } });
  });

  it("fuera de la lista, la sesión sigue sin portal: 403 por portal", async () => {
    const res = await ruta.GET(
      new Request("http://localhost:3000/api/v1/core/cuentas/list?input=%7B%7D", {
        headers: { origin: "http://localhost:3000" },
      }),
      params(["core", "cuentas", "list"]),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: { message: "No tienes acceso a este portal." },
    });
  });
});
