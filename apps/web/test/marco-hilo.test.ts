import { describe, expect, it, vi } from "vitest";

// El menú importa la acción de salir (servidor); aquí solo se arma la lista.
vi.mock("@/app/_acciones/auth", () => ({ accionSalir: () => undefined }));

describe("tema de la barra", () => {
  it("el botón de tema pasa al contrario de lo que se ve, también si sigue al sistema", async () => {
    const { temaContrario } = await import("@/lib/tema");
    expect(temaContrario("dark", false)).toBe("claro");
    expect(temaContrario("light", true)).toBe("oscuro");
    expect(temaContrario(undefined, true)).toBe("claro");
    expect(temaContrario(undefined, false)).toBe("oscuro");
  });
});

describe("menú de usuario sin atajo de diseño (CAR-335 D6c)", () => {
  it("el diseño nuevo es el único: el menú ya no ofrece cambiar de diseño", async () => {
    const { menuCuentaShell } = await import("@/app/_components/menu-cuenta-shell");
    const nada = () => undefined;
    expect(menuCuentaShell(true, nada, nada, true).some((i) => i.id === "diseno")).toBe(false);
    expect(menuCuentaShell(true, nada, nada, true).some((i) => i.id === "pref")).toBe(true);
  });
});

describe("marco que se monta: una sola regla para el layout y las páginas", () => {
  it("con acceso, todos los portales con empresa usan el diseño nuevo (CAR-335 D6e)", async () => {
    const { marcoResuelto } = await import("@/lib/marco");
    expect(marcoResuelto("erp", true)).toBe("nuevo");
    expect(marcoResuelto("erp", false)).toBe("clasico");
    expect(marcoResuelto("supervisor", true)).toBe("nuevo");
    expect(marcoResuelto("cliente", true)).toBe("nuevo");
    expect(marcoResuelto("terreno", true)).toBe("nuevo");
    expect(marcoResuelto("trabajador", true)).toBe("nuevo");
    expect(marcoResuelto("platform", false)).toBe("clasico");
  });
});
