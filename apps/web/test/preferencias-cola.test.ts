import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, ejecutar: vi.fn(), exito: vi.fn(),
}));
// Como `navegacion-cola.test.ts`: ejercita la cola asíncrona real del hook, con estado conservado
// entre renders (useRef/useState de verdad, sin un renderer de React).
vi.mock("react", () => ({
  useRef: (valor: unknown) => {
    const i = h.cursor++;
    if (!(i in h.slots)) h.slots[i] = { current: valor };
    return h.slots[i];
  },
  useState: (valor: unknown) => {
    const i = h.cursor++;
    if (!(i in h.slots)) h.slots[i] = valor;
    return [
      h.slots[i],
      (siguiente: unknown) => {
        h.slots[i] = typeof siguiente === "function" ? (siguiente as (x: unknown) => unknown)(h.slots[i]) : siguiente;
      },
    ];
  },
}));
vi.mock("@opai/ds", () => ({ avisar: { exito: h.exito, error: vi.fn(), info: vi.fn() } }));
vi.mock("@/app/_components/use-capacidad", () => ({
  useCapacidad: () => ({ ejecutar: h.ejecutar, pendiente: false, error: null }),
}));
import { type Valores, usePreferencias } from "@/app/(erp)/configuracion/preferencias/use-preferencias";

const INICIAL: Valores = { tema: "sistema", silencio: false, resumen: "nunca" };
function PreferenciasPrueba(inicial: Valores) {
  return usePreferencias(inicial);
}
function render(inicial: Valores = INICIAL) {
  h.cursor = 0;
  return PreferenciasPrueba(inicial);
}

beforeEach(() => {
  h.slots = [];
  h.cursor = 0;
  h.ejecutar.mockReset();
  h.exito.mockReset();
  vi.stubGlobal("document", { documentElement: { dataset: {} as Record<string, string> } });
  vi.stubGlobal("localStorage", { setItem: () => undefined });
});

describe("preferencias: cola serial por formulario (regresión del PR #109)", () => {
  it("tres clics seguidos al tema solo envían el último elegido, en orden", async () => {
    let liberar: (r: { ok: true; data: { version: number } }) => void = () => undefined;
    let llamadas = 0;
    h.ejecutar.mockImplementation(
      () =>
        new Promise((resolve) => {
          llamadas += 1;
          liberar = resolve as typeof liberar;
        }),
    );
    const prefs = render();
    prefs.guardar("tema", "claro", "preferencias_tema");
    prefs.guardar("tema", "oscuro", "preferencias_tema");
    prefs.guardar("tema", "sistema", "preferencias_tema");
    await vi.waitFor(() => expect(llamadas).toBe(1));
    expect(h.ejecutar).toHaveBeenCalledTimes(1);
    expect(h.ejecutar).toHaveBeenCalledWith("core.config.set", {
      modulo: "core",
      clave: "preferencias_tema",
      valor: "sistema",
    });
    liberar({ ok: true, data: { version: 1 } });
    await vi.waitFor(() => expect(h.exito).toHaveBeenCalledTimes(1));
    expect(llamadas).toBe(1);
    expect(render().v.tema).toBe("sistema");
  });

  it("si el pedido falla, revierte al último valor confirmado por el servidor", async () => {
    h.ejecutar.mockResolvedValueOnce(null);
    const prefs = render();
    prefs.guardar("silencio", true, "preferencias_silencio");
    await vi.waitFor(() => expect(render().v.silencio).toBe(false));
  });

  it("dos campos distintos no se pisan: cada uno guarda su propio último valor", async () => {
    h.ejecutar.mockImplementation(() => Promise.resolve({ ok: true, data: { version: 1 } }));
    const prefs = render();
    prefs.guardar("tema", "oscuro", "preferencias_tema");
    prefs.guardar("resumen", "diario", "preferencias_resumen");
    await vi.waitFor(() => expect(h.ejecutar).toHaveBeenCalledTimes(2));
    expect(h.ejecutar).toHaveBeenNthCalledWith(1, "core.config.set", {
      modulo: "core",
      clave: "preferencias_tema",
      valor: "oscuro",
    });
    expect(h.ejecutar).toHaveBeenNthCalledWith(2, "core.config.set", {
      modulo: "core",
      clave: "preferencias_resumen",
      valor: "diario",
    });
  });
});
