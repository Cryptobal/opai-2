import { afterEach, describe, expect, it, vi } from "vitest";

import { lectorApiOpai1, verificarEmpresaOrigen } from "../../scripts/importar-opai1/origen-api";

const pagina = (recurso: string, siguiente: string | null, cursor: string | null, filas: unknown[] = []) =>
  Response.json({ version: "opai1-export/v1", generadoEn: "2026-11-04T00:00:00Z", recurso, cursor, siguiente, filas });

describe("empresa de origen y paginación", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rechaza filas de más de una empresa o de una distinta a la esperada", () => {
    expect(() => verificarEmpresaOrigen(new Set(["a", "b"]))).toThrow(/más de una empresa/);
    expect(() => verificarEmpresaOrigen(new Set(["a"]), "b")).toThrow(/no es la esperada/);
    expect(() => verificarEmpresaOrigen(new Set(["a"]), "a")).not.toThrow();
    expect(() => verificarEmpresaOrigen(new Set())).not.toThrow();
  });

  it("corta un cursor que se repite", async () => {
    vi.stubGlobal("fetch", async (u: URL) => pagina(u.pathname.split("/").pop() ?? "", "c1", u.searchParams.get("cursor")));
    vi.stubEnv("OPAI1_EXPORT_KEY", "opai_mcp_ejemploFicticio");
    await expect(lectorApiOpai1("https://1.0.test/v1").leer()).rejects.toThrow(/cursor repetido/);
  });
});
