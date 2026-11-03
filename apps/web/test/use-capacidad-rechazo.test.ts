import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, accion: vi.fn() }));
// Estado conservado entre renders sin un renderer de React (como `preferencias-cola.test.ts`).
vi.mock("react", () => ({
  useCallback: <T>(f: T) => f,
  useState: (valor: unknown) => {
    const i = h.cursor++;
    if (!(i in h.slots)) h.slots[i] = valor;
    return [h.slots[i], (siguiente: unknown) => void (h.slots[i] = siguiente)];
  },
}));
vi.mock("@/app/_acciones/capacidad", () => ({ ejecutarCapacidad: h.accion }));

import { useCapacidad } from "@/app/_components/use-capacidad";

function CapacidadPrueba() {
  return useCapacidad("erp");
}
function render() {
  h.cursor = 0;
  return CapacidadPrueba();
}

beforeEach(() => {
  h.slots = [];
  h.accion.mockReset();
});

describe("useCapacidad", () => {
  it("un rechazo de la acción (red o despliegue) queda como error INTERNAL y devuelve null", async () => {
    h.accion.mockRejectedValueOnce(new Error("Failed to fetch"));
    await expect(render().ejecutar("core.config.set", {})).resolves.toBeNull();
    const despues = render();
    expect(despues.codigo).toBe("INTERNAL");
    expect(despues.error).toMatch(/Ocurrió un error de nuestro lado/);
    expect(despues.pendiente).toBe(false);
  });

  it("tras el rechazo, el pedido siguiente funciona y limpia el error", async () => {
    h.accion.mockRejectedValueOnce(new Error("Failed to fetch"));
    h.accion.mockResolvedValueOnce({ ok: true, data: { version: 2 }, dryRun: false });
    await render().ejecutar("core.config.set", {});
    await expect(render().ejecutar("core.config.set", {})).resolves.toEqual({ version: 2 });
    expect(render().error).toBeNull();
  });
});
