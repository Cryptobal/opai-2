import { beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba } from "../src/testing";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const ok = <T>(r: { ok: boolean; data?: unknown }) => {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.data as T;
};

describe("core.novedades", () => {
  it("lista entradas del catálogo con conteo de no leídas", async () => {
    const { ctx } = contextoDePrueba({ modulosActivos: ["core", "finanzas", "comercial", "cpq"] });
    const data = ok<{ items: { id: string }[]; noLeidas: number }>(
      await executeCapability(ctx, "core.novedades.list", {}),
    );
    expect(data.items.length).toBeGreaterThanOrEqual(5);
    expect(data.noLeidas).toBe(data.items.length);
  });

  it("marca como leídas y reduce el conteo", async () => {
    const { ctx } = contextoDePrueba({ modulosActivos: ["core", "finanzas", "comercial", "cpq"] });
    const antes = ok<{ items: { id: string }[] }>(
      await executeCapability(ctx, "core.novedades.list", {}),
    );
    const ids = antes.items.slice(0, 2).map((i) => i.id);
    ok(await executeCapability(ctx, "core.novedades.marcar_leidas", { ids }));
    const despues = ok<{ noLeidas: number }>(
      await executeCapability(ctx, "core.novedades.list", {}),
    );
    expect(despues.noLeidas).toBe(antes.items.length - 2);
  });
});
