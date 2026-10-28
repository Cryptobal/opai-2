import { describe, expect, it, vi } from "vitest";

import type { Fuentes } from "../lib/fuentes";
import { fuentesFalsas } from "./fuentes-falsas";

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
vi.stubEnv("BETTER_AUTH_SECRET", "secreto-de-prueba-de-al-menos-32-caracteres");
// Cada test cambia la key o los módulos activos; el servidor MCP lee las fuentes en cada request.
const estado = { f: fuentesFalsas() };
vi.mock("../lib/fuentes", async (original) => ({
  ...(await original<object>()),
  fuentesReales: new Proxy({} as Fuentes, {
    get: (_t, k: keyof Fuentes) => estado.f.fuentes[k],
  }),
}));

async function herramientas(o: Parameters<typeof fuentesFalsas>[0]): Promise<string[]> {
  estado.f = fuentesFalsas(o);
  const { manejarMcp } = await import("../lib/mcp");
  const res = await manejarMcp(
    new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    }),
    estado.f.secreto,
  );
  const texto = await res.text();
  const rpc = JSON.parse(/\{.*\}/s.exec(texto)?.[0] ?? "{}") as {
    result?: { tools?: { name: string }[] };
  };
  return rpc.result?.tools?.map((t) => t.name) ?? [];
}

const COMERCIAL = [
  "comercial_negocios_create",
  "preview_comercial_negocios_create",
  "comercial_negocios_get",
  "comercial_negocios_list",
  "comercial_negocios_embudo",
  "comercial_negocios_vincular_instalacion",
  "comercial_negocios_set_contactos",
];

describe("MCP: herramientas según módulo activo y scopes de la key (servidor real)", () => {
  it("con Comercial activo, una key «*» o con el scope comercial lista comercial_*", async () => {
    for (const scopes of [["*"], ["core", "comercial"]]) {
      const nombres = await herramientas({ modulosActivos: ["comercial"], key: { scopes } });
      for (const n of COMERCIAL) expect(nombres, `${scopes.join(",")}: ${n}`).toContain(n);
    }
  });

  it("sin el scope comercial (key por módulos) o con el módulo inactivo, no lista comercial_*", async () => {
    const sinScope = await herramientas({
      modulosActivos: ["comercial"],
      key: { scopes: ["core"] },
    });
    expect(sinScope.filter((n) => n.includes("comercial_"))).toEqual([]);
    expect(sinScope).toContain("core_me");
    const inactivo = await herramientas({ modulosActivos: [], key: { scopes: ["*"] } });
    expect(inactivo.filter((n) => n.includes("comercial_"))).toEqual([]);
  });

  it("plataforma: solo con el scope platform y un responsable con platformRole (ADR-055)", async () => {
    const conRol = await herramientas({
      platformRole: "owner",
      key: { scopes: ["*", "platform"] },
    });
    expect(conRol).toContain("platform_modules_set");
    expect(conRol).toContain("preview_platform_modules_set");
    expect(conRol).toContain("platform_tenants_list");
    expect(conRol).toContain("platform_tenants_get");
    const soloTodo = await herramientas({ platformRole: "owner", key: { scopes: ["*"] } });
    expect(soloTodo.filter((n) => n.includes("platform_"))).toEqual([]);
    const sinRol = await herramientas({ platformRole: null, key: { scopes: ["*", "platform"] } });
    expect(sinRol.filter((n) => n.includes("platform_"))).toEqual([]);
  });
});
