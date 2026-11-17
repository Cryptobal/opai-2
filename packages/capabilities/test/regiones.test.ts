import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo, executeCapability, limpiarRegistro, registrarCapacidades } from "../src";
import { contextoDePrueba } from "../src/testing";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

describe("core.regiones.list", () => {
  it("devuelve las 16 regiones", async () => {
    const { ctx } = contextoDePrueba();
    const r = await executeCapability(ctx, "core.regiones.list", {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.items).toHaveLength(16);
    expect(r.data.items.map((x) => x.nombre)).toContain("Región Metropolitana");
    expect(r.data.items.map((x) => x.nombre)).toContain("Ñuble");
  });
});