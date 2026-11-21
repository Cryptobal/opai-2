// Manual docs/2.0/agentes/central.md (ADR-034): la copia servida por MCP es idéntica al archivo y
// toda herramienta que nombra existe. El escenario con base real está en central-manual-db.test.ts.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { MANUALES } from "../../src";

const RUTA = new URL("../../../../docs/2.0/agentes/central.md", import.meta.url);
const SNAPSHOT = new URL("../__snapshots__/herramientas-mcp.txt", import.meta.url);

describe("manual del agente de central", () => {
  it("la copia del MCP es idéntica al archivo", () => {
    expect(MANUALES.find((m) => m.id === "central")?.texto).toBe(readFileSync(RUTA, "utf8"));
  });

  it("toda herramienta nombrada existe en la instantánea", () => {
    const nombradas = [...readFileSync(RUTA, "utf8").matchAll(/`((?:preview_)?(?:core|central)_[a-z_]+)`/g)].map((m) => m[1] ?? "");
    const existentes = new Set(readFileSync(SNAPSHOT, "utf8").split("\n"));
    expect(nombradas.length).toBeGreaterThan(8);
    expect(nombradas.filter((n) => !existentes.has(n))).toEqual([]);
  });
});
