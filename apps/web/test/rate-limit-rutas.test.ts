import { beforeAll, describe, expect, it, vi } from "vitest";

import type * as V1 from "../app/api/v1/[...capability]/route";
import type * as Mcp from "../app/api/mcp/[[...transport]]/route";
import type * as McpK from "../app/api/mcp/k/[key]/[[...transport]]/route";

// `vi.hoisted` porque la fábrica de `vi.mock` se eleva sobre las declaraciones del archivo.
const { permitir } = vi.hoisted(() => ({
  permitir: vi.fn<(c: string, m: number, v?: number) => Promise<boolean>>(),
}));

// Se simula el limitador para controlar el veredicto sin tocar la base.
vi.mock("@/lib/rate-limit", () => ({
  permitir,
  ipDe: () => "1.2.3.4",
  ipDeCabeceras: () => "1.2.3.4",
  LIMITES: {
    apiPorPrincipal: { maximo: 120, ventanaMs: 60_000 },
    apiPorIp: { maximo: 240, ventanaMs: 60_000 },
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
vi.stubEnv("BETTER_AUTH_SECRET", "secreto-de-prueba-de-al-menos-32-caracteres");

let v1: typeof V1;
let mcp: typeof Mcp;
let mcpK: typeof McpK;

beforeAll(async () => {
  v1 = await import("../app/api/v1/[...capability]/route");
  mcp = await import("../app/api/mcp/[[...transport]]/route");
  mcpK = await import("../app/api/mcp/k/[key]/[[...transport]]/route");
});

describe("rate limit en las rutas (NÚCLEO-B)", () => {
  it("/api/v1 responde 429 con Retry-After cuando se supera el límite por IP", async () => {
    permitir.mockResolvedValue(false);
    const res = await v1.GET(new Request("http://x/api/v1/core/me"), {
      params: Promise.resolve({ capability: ["core", "me"] }),
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "RATE_LIMITED" } });
  });

  it("/api/mcp responde 429 cuando se supera el límite por IP", async () => {
    permitir.mockResolvedValue(false);
    const res = await mcp.POST(new Request("http://x/api/mcp", { method: "POST" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("key en la URL deprecada (NÚCLEO-B)", () => {
  it("/api/mcp/k/<key> responde 410 Gone sin la variable MCP_KEY_EN_URL_HASTA", async () => {
    vi.stubEnv("MCP_KEY_EN_URL_HASTA", "");
    permitir.mockResolvedValue(true);
    const res = await mcpK.GET(new Request("http://x/api/mcp/k/opai_demo_123"), {
      params: Promise.resolve({ key: "opai_demo_123" }),
    });
    expect(res.status).toBe(410);
    expect(res.headers.get("Link")).toContain("/api/mcp");
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "GONE" } });
  });
});
