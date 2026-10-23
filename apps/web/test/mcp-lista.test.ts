import { describe, expect, it, vi } from "vitest";

import { fuentesFalsas } from "./fuentes-falsas";

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
vi.stubEnv("BETTER_AUTH_SECRET", "secreto-de-prueba-de-al-menos-32-caracteres");
const f = fuentesFalsas();
vi.mock("../lib/fuentes", async (original) => ({
  ...(await original<object>()),
  fuentesReales: f.fuentes,
}));

type Rpc = { result?: { tools?: { name: string }[]; instructions?: string; nextCursor?: string } };

async function rpc(metodo: string, params: unknown = {}): Promise<Rpc> {
  const { manejarMcp } = await import("../lib/mcp");
  const res = await manejarMcp(
    new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: metodo, params }),
    }),
    f.secreto,
  );
  const texto = await res.text();
  return JSON.parse(/\{.*\}/s.exec(texto)?.[0] ?? "{}") as Rpc;
}

describe("MCP de punta a punta (servidor real, key de owner con scope *)", () => {
  it("tools/list entrega todas las herramientas visibles, sin paginar ni recortar", async () => {
    const lista = await rpc("tools/list");
    const nombres = lista.result?.tools?.map((t) => t.name) ?? [];
    expect(lista.result?.nextCursor).toBeUndefined();
    expect(nombres.length).toBeGreaterThan(150);
    expect(nombres).toContain("core_integraciones_list");
    expect(nombres).toContain("core_geo_autocompletar");
    expect(nombres).toContain("preview_core_users_invite");
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it("initialize declara cuántas herramientas ve la key y coincide con tools/list", async () => {
    const init = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "prueba", version: "1" },
    });
    const total = (await rpc("tools/list")).result?.tools?.length ?? 0;
    expect(init.result?.instructions).toContain(`Esta key ve ${total} herramientas`);
  });
});
