import { describe, expect, it, vi } from "vitest";

import { COOKIE_MARCO, cookieMarco, marcoDeCookie, portalAdmiteHilo, rutaAncha } from "@/lib/marco";

// El menú importa la acción de salir (servidor); aquí solo se arma la lista.
vi.mock("@/app/_acciones/auth", () => ({ accionSalir: () => undefined }));

describe("elección del marco (ADR-090)", () => {
  it("sin cookie o con un valor desconocido queda el marco clásico", () => {
    expect(marcoDeCookie(undefined)).toBe("clasico");
    expect(marcoDeCookie("")).toBe("clasico");
    expect(marcoDeCookie("HILO")).toBe("clasico");
    expect(marcoDeCookie("hilo")).toBe("hilo");
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
    expect(cookieMarco("clasico")).toContain("Max-Age=0");
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

describe("atajo de diseño en el menú de usuario", () => {
  it("ofrece pasar al otro diseño, justo después de Preferencias, solo en el ERP", async () => {
    const { menuCuentaShell } = await import("@/app/_components/menu-cuenta-shell");
    const nada = () => undefined;
    const cambiar = vi.fn();
    const clasico = menuCuentaShell(true, nada, nada, true, {}, undefined, undefined, {
      actual: "clasico",
      onCambiar: cambiar,
    });
    const ids = clasico.map((i) => i.id);
    expect(ids.indexOf("diseno")).toBe(ids.indexOf("pref") + 1);
    const item = clasico.find((i) => i.id === "diseno");
    expect(item?.etiqueta).toBe("Probar el diseño Hilo");
    item?.onSelect();
    expect(cambiar).toHaveBeenCalledWith("hilo");
    const hilo = menuCuentaShell(true, nada, nada, true, {}, undefined, undefined, {
      actual: "hilo",
      onCambiar: cambiar,
    });
    expect(hilo.find((i) => i.id === "diseno")?.etiqueta).toBe("Volver al diseño clásico");
    expect(menuCuentaShell(false, nada, nada, false).some((i) => i.id === "diseno")).toBe(false);
    expect(menuCuentaShell(true, nada, nada, true).some((i) => i.id === "diseno")).toBe(false);
  });
});

describe("marco que se monta: una sola regla para el layout y las páginas", () => {
  it("fuera del ERP o sin acceso es el clásico aunque la cookie diga hilo", async () => {
    const { marcoResuelto } = await import("@/lib/marco");
    expect(marcoResuelto("erp", true, "hilo")).toBe("hilo");
    expect(marcoResuelto("erp", false, "hilo")).toBe("clasico");
    expect(marcoResuelto("supervisor", true, "hilo")).toBe("clasico");
    expect(marcoResuelto("erp", true, undefined)).toBe("clasico");
  });
});
