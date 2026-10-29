import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, ejecutar: vi.fn(), exito: vi.fn(), guardado: {} as Record<string, string>,
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
const Prueba = (inicial: Valores) => usePreferencias(inicial);
function render(inicial: Valores = INICIAL) {
  h.cursor = 0;
  return Prueba(inicial);
}

beforeEach(() => {
  h.slots = [];
  h.cursor = 0;
  h.ejecutar.mockReset();
  h.exito.mockReset();
  vi.stubGlobal("document", { documentElement: { dataset: {} as Record<string, string> } });
  h.guardado = {};
  vi.stubGlobal("localStorage", { setItem: (k: string, v: string) => void (h.guardado[k] = v) });
});

describe("preferencias: cola serial por formulario (regresión del PR #109)", () => {
  it("tres clics seguidos al tema solo envían el último elegido, en orden", async () => {
    let liberar: (r: { ok: true; data: { version: number } }) => void = () => undefined;
    let llamadas = 0;
    h.ejecutar.mockImplementation(
      () => new Promise((resolve) => ((llamadas += 1), (liberar = resolve as typeof liberar))),
    );
    const prefs = render();
    prefs.guardar("tema", "claro", "preferencias_tema");
    prefs.guardar("tema", "oscuro", "preferencias_tema");
    prefs.guardar("tema", "sistema", "preferencias_tema");
    await vi.waitFor(() => expect(llamadas).toBe(1));
    expect(h.ejecutar).toHaveBeenCalledTimes(1);
    const esperado = { modulo: "core", clave: "preferencias_tema", valor: "sistema" };
    // `false, "ninguna"`: sin dryRun y sin revalidar el layout (B1, H1/H2).
    expect(h.ejecutar).toHaveBeenCalledWith("core.config.set", esperado, false, "ninguna");
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
    const cs = "core.config.set";
    expect(h.ejecutar).toHaveBeenNthCalledWith(1, cs, { modulo: "core", clave: "preferencias_tema", valor: "oscuro" }, false, "ninguna");
    expect(h.ejecutar).toHaveBeenNthCalledWith(2, cs, { modulo: "core", clave: "preferencias_resumen", valor: "diario" }, false, "ninguna");
  });

  it("un guardado rechazado revierte el tema y avisa; la cola sigue y el siguiente sale", async () => {
    h.ejecutar.mockRejectedValueOnce(new Error("Failed to fetch"));
    h.ejecutar.mockResolvedValueOnce({ version: 1 });
    const html = (document as unknown as { documentElement: { dataset: Record<string, string> } })
      .documentElement;
    render().guardar("tema", "oscuro", "preferencias_tema");
    expect(html.dataset["theme"]).toBe("dark");
    // H3: la Alerta nombra el tema al que se volvió, no un texto genérico.
    const msg = "No pudimos guardar el tema; volvimos a Sistema.";
    await vi.waitFor(() => expect(render().error).toBe(msg));
    expect(render().v.tema).toBe("sistema");
    expect(html.dataset["theme"]).toBeUndefined();
    expect(h.guardado["opai_tema"]).toBe("sistema");
    render().guardar("tema", "claro", "preferencias_tema");
    await vi.waitFor(() => expect(h.exito).toHaveBeenCalledTimes(1));
    expect(h.ejecutar).toHaveBeenCalledTimes(2);
    expect(render().v.tema).toBe("claro");
    expect(render().error).toBeNull();
    expect(h.guardado["opai_tema"]).toBe("claro");
  });

  it("si el último guardado falla, revierte al último tema confirmado por el servidor (H2)", async () => {
    // Primero confirma Oscuro; luego un intento a Claro falla y debe volver a Oscuro, no al inicial.
    h.ejecutar.mockResolvedValueOnce({ version: 1 });
    render().guardar("tema", "oscuro", "preferencias_tema");
    await vi.waitFor(() => expect(h.exito).toHaveBeenCalledTimes(1));
    expect(render().v.tema).toBe("oscuro");
    h.ejecutar.mockResolvedValueOnce(null);
    render().guardar("tema", "claro", "preferencias_tema");
    const msg = "No pudimos guardar el tema; volvimos a Oscuro.";
    await vi.waitFor(() => expect(render().error).toBe(msg));
    expect(render().v.tema).toBe("oscuro");
    expect(h.guardado["opai_tema"]).toBe("oscuro");
  });

  it("una respuesta vieja que llega tarde no muestra «guardada» ni pisa la elección nueva (H2)", async () => {
    let liberar: (r: { version: number }) => void = () => undefined;
    h.ejecutar.mockImplementationOnce(() => new Promise((resolve) => (liberar = resolve)));
    h.ejecutar.mockResolvedValueOnce({ version: 2 });
    render().guardar("tema", "oscuro", "preferencias_tema");
    await vi.waitFor(() => expect(h.ejecutar).toHaveBeenCalledTimes(1));
    render().guardar("tema", "claro", "preferencias_tema");
    liberar({ version: 1 }); // el pedido viejo (Oscuro) responde cuando ya no es el último
    await vi.waitFor(() => expect(h.ejecutar).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(h.exito).toHaveBeenCalledTimes(1));
    expect(render().v.tema).toBe("claro");
    expect(h.guardado["opai_tema"]).toBe("claro");
  });

  it("un fallo en vuelo no revierte una elección más nueva, aunque repita el mismo valor", async () => {
    let fallar: (r: null) => void = () => undefined;
    h.ejecutar.mockImplementationOnce(() => new Promise((resolve) => (fallar = resolve)));
    h.ejecutar.mockResolvedValueOnce({ version: 1 });
    render().guardar("tema", "oscuro", "preferencias_tema");
    await vi.waitFor(() => expect(h.ejecutar).toHaveBeenCalledTimes(1));
    render().guardar("tema", "claro", "preferencias_tema");
    render().guardar("tema", "oscuro", "preferencias_tema");
    fallar(null);
    await vi.waitFor(() => expect(h.exito).toHaveBeenCalledTimes(1));
    expect(h.ejecutar).toHaveBeenCalledTimes(2);
    expect(render().v.tema).toBe("oscuro");
    expect(h.guardado["opai_tema"]).toBe("oscuro");
  });
});
