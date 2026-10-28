import { beforeEach, expect, it, vi } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

const ids = [1, 2, 3].map((n) => `0192f3a0-0000-7000-8000-00000000000${n}`);
function contexto(n: number) {
  return contextoDePrueba({
    semilla: {
      persona: ids.slice(0, n).map((id, i) => ({
        id,
        nombres: "Persona",
        apellidos: String(i),
        rut: "12.345.678-5",
      })),
    },
  });
}
type Lista = { total: number; items: { id: string }[]; siguiente: string | null };

it.each([0, 2])(
  "primera página completa (%i filas): total exacto sin count adicional",
  async (n) => {
    const { ctx } = contexto(n);
    const count = vi.spyOn(ctx.db.persona, "count");
    const r = await dato<Lista>(ctx, "core.personas.list", { limite: 2 });
    expect(r.total).toBe(n);
    expect(r.items).toHaveLength(n);
    expect(count).not.toHaveBeenCalled();
  },
);

it("con más páginas o cursor conserva el total exacto, no el tamaño de la página", async () => {
  const { ctx } = contexto(3);
  const count = vi.spyOn(ctx.db.persona, "count");
  const primera = await dato<Lista>(ctx, "core.personas.list", { limite: 2 });
  expect(primera.total).toBe(3);
  const segunda = await dato<Lista>(ctx, "core.personas.list", {
    limite: 2,
    cursor: primera.siguiente,
  });
  expect(segunda.total).toBe(3);
  expect(segunda.items.map((x) => x.id)).toEqual([ids[2]]);
  expect(count).toHaveBeenCalledTimes(2);
});
