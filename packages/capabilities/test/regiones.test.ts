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
    const data = r.data as { items: { nombre: string }[]; siguiente: string | null };
    expect(data.items).toHaveLength(16);
    expect(data.siguiente).toBeNull();
    expect(data.items.map((x) => x.nombre)).toContain("Región Metropolitana");
    expect(data.items.map((x) => x.nombre)).toContain("Ñuble");
  });
});