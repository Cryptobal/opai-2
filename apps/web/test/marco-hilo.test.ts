import { describe, expect, it, vi } from "vitest";

import { COOKIE_MARCO, cookieMarco, marcoDeCookie, portalAdmiteHilo, rutaAncha } from "@/lib/marco";

// El menú importa la acción de salir (servidor); aquí solo se arma la lista.
vi.mock("@/app/_acciones/auth", () => ({ accionSalir: () => undefined }));

describe("elección del marco (ADR-090)", () => {
  it("sin cookie o con un valor desconocido queda el diseño nuevo (ADR-109, D6)", () => {
    expect(marcoDeCookie(undefined)).toBe("nuevo");
    expect(marcoDeCookie("")).toBe("nuevo");
    expect(marcoDeCookie("HILO")).toBe("nuevo");
    expect(marcoDeCookie("hilo")).toBe("hilo");
    expect(marcoDeCookie("clasico")).toBe("clasico");
    expect(marcoDeCookie("nuevo")).toBe("nuevo");
  });

  it("el clásico elegido se recuerda un año; el nuevo es la ausencia de la cookie", () => {
    expect(cookieMarco("clasico")).toContain(`${COOKIE_MARCO}=clasico`);
    expect(cookieMarco("clasico")).toContain("Max-Age=31536000");
    expect(cookieMarco("nuevo")).toContain("Max-Age=0");
  });

  it("en esta etapa el Hilo solo existe en el ERP y con acceso a la empresa", () => {
    expect(portalAdmiteHilo("erp", true)).toBe(true);
    expect(portalAdmiteHilo("erp", false)).toBe(false);
    expect(portalAdmiteHilo("supervisor", true)).toBe(false);
    expect(portalAdmiteHilo("platform", true)).toBe(false);
  });

  it("la cookie dura un año, vale en todo el sitio y no viaja a otros sitios", () => {
    const c = cookieMarco("hilo");
    expect(c).toContain(`${COOKIE_MARCO}=hilo`);
    expect(c).toContain("Path=/");
    expect(c).toContain("Max-Age=31536000");
    expect(c).toContain("SameSite=Lax");
  });

  it("las planillas pliegan el hilo; sus fichas y las demás pantallas no", () => {
    expect(rutaAncha("/pauta")).toBe(true);
    expect(rutaAncha("/finanzas/flujo")).toBe(true);
    expect(rutaAncha("/asistencia/2026-11")).toBe(true);
    expect(rutaAncha("/pautas")).toBe(false);
    expect(rutaAncha("/cuentas")).toBe(false);
    expect(rutaAncha("/")).toBe(false);
  });
});

describe("tema del marco Hilo", () => {
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
  it("con acceso, todos los portales con empresa usan el diseño nuevo, también terreno (CAR-335 D6e)", async () => {
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
