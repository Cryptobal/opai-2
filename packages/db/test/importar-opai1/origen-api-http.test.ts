import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { lectorApiOpai1 } from "../../scripts/importar-opai1/origen-api";

const FIX = new URL("../fixtures/opai1-export-v1", import.meta.url).pathname;

describe("lector HTTP del exportador real", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("pide solo los recursos que el exportador acepta y recorre la paginación", async () => {
    const pedidos: string[] = [];
    vi.stubGlobal("fetch", async (u: URL) => {
      const recurso = u.pathname.split("/").pop() ?? "";
      const cursor = u.searchParams.get("cursor");
      pedidos.push(`${recurso}${cursor ? `?${cursor}` : ""}`);
      const dir = join(FIX, recurso);
      if (!existsSync(dir)) return new Response('{"error":"not_found"}', { status: 404 });
      const paginas = readdirSync(dir)
        .sort()
        .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as { cursor: string | null });
      const pagina = paginas.find((p) => p.cursor === cursor);
      return pagina
        ? Response.json(pagina)
        : new Response('{"error":"bad_request"}', { status: 400 });
    });
    vi.stubEnv("OPAI1_EXPORT_KEY", "opai_mcp_ejemploFicticio");
    const datos = await lectorApiOpai1("https://1.0.test/api/export/opai2/v1/").leer();
    const recursos = new Set(pedidos.map((p) => p.split("?")[0]));
    expect([...recursos].sort()).toEqual(
      [
        "actividades",
        "cotizaciones",
        "cuentas",
        "contactos",
        "etapas",
        "instalaciones",
        "negocios",
        "recurrentes",
      ].sort(),
    );
    expect(pedidos.filter((p) => p.startsWith("negocios"))).toHaveLength(2);
    expect(datos.deals).toHaveLength(2);
    expect(datos.cpqQuotes[0]?.code).toBe("CPQ-2026-007");
  });
});
