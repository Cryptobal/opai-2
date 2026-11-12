import { describe, expect, it, vi } from "vitest";

import { fuentesFalsas } from "./fuentes-falsas";

// CAR-287: OPAI como conector interactivo de Claude (MCP Apps). La herramienta de pendientes apunta a
// una vista `ui://` que el cliente dibuja; la vista es autocontenida (sin scripts ni estilos externos)
// y solo habla con OPAI por el cliente, con las herramientas y permisos de quien se conectó.
vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
vi.stubEnv("BETTER_AUTH_SECRET", "secreto-de-prueba-de-al-menos-32-caracteres");
const f = fuentesFalsas();
vi.mock("../lib/fuentes", async (original) => ({
  ...(await original<object>()),
  fuentesReales: f.fuentes,
}));

const URI = "ui://opai/pendientes.html";
type Rpc = {
  result?: {
    tools?: { name: string; _meta?: { ui?: { resourceUri?: string } } }[];
    resources?: { uri: string; mimeType?: string }[];
    contents?: { uri: string; mimeType?: string; text?: string }[];
  };
};

async function rpc(method: string, params: unknown = {}): Promise<Rpc> {
  const { manejarMcp } = await import("../lib/mcp");
  const res = await manejarMcp(
    new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
    f.secreto,
  );
  return JSON.parse(/\{.*\}/s.exec(await res.text())?.[0] ?? "{}") as Rpc;
}

describe("vistas del MCP (MCP Apps)", () => {
  it("la herramienta de pendientes declara su vista", async () => {
    const tools = (await rpc("tools/list")).result?.tools ?? [];
    const pendientes = tools.find((t) => t.name === "core_inicio_pendientes");
    expect(pendientes?._meta?.ui?.resourceUri).toBe(URI);
  });

  it("la vista se publica como recurso MCP App", async () => {
    const recursos = (await rpc("resources/list")).result?.resources ?? [];
    expect(recursos.find((r) => r.uri === URI)?.mimeType).toBe("text/html;profile=mcp-app");
  });

  it("la vista es autocontenida y usa el protocolo de MCP Apps", async () => {
    const [c] = (await rpc("resources/read", { uri: URI })).result?.contents ?? [];
    expect(c?.mimeType).toBe("text/html;profile=mcp-app");
    const html = c?.text ?? "";
    expect(html).toContain("ui/initialize");
    expect(html).toContain("ui/notifications/tool-result");
    expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+href=|@import/);
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});
