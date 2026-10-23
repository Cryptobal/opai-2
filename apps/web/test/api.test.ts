import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as health } from "../app/api/health/route";
import { GET as capacidadGet } from "../app/api/v1/[...capability]/route";

describe("GET /api/health", () => {
  it("responde ok con versión y commit", async () => {
    const res = health();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      version: expect.any(String),
      commit: "local",
    });
  });
});

describe("GET /api/v1/core/ping", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("responde 503 sin DEV_TENANT_ID", async () => {
    vi.stubEnv("DEV_TENANT_ID", "");
    const res = await capacidadGet(new Request("http://x/api/v1/core/ping"), {
      params: Promise.resolve({ capability: ["core", "ping"] }),
    });
    expect(res.status).toBe(503);
  });

  it("responde 404 para una capacidad inexistente", async () => {
    vi.stubEnv("DEV_TENANT_ID", "0192f3a0-0000-7000-8000-000000000001");
    const res = await capacidadGet(new Request("http://x/api/v1/core/nada"), {
      params: Promise.resolve({ capability: ["core", "nada"] }),
    });
    expect(res.status).toBe(404);
  });

  it("responde 200 con DEV_TENANT_ID (core.ping no toca la base)", async () => {
    vi.stubEnv("DEV_TENANT_ID", "0192f3a0-0000-7000-8000-000000000001");
    vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
    const res = await capacidadGet(
      new Request("http://x/api/v1/core/ping?input=%7B%22mensaje%22%3A%22hola%22%7D"),
      {
        params: Promise.resolve({ capability: ["core", "ping"] }),
      },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, data: { pong: true, mensaje: "hola" } });
  });
});
