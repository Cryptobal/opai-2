import { describe, expect, it, vi } from "vitest";

import { menuCuentaShell } from "@/app/_components/menu-cuenta-shell";
import { anchoMenuDeCookie, COOKIE_ANCHO_MENU, cookieAnchoMenu } from "@/lib/menu-ancho";

// El menú importa la acción de salir (servidor); aquí solo se arma la lista.
vi.mock("@/app/_acciones/auth", () => ({ accionSalir: () => undefined }));

describe("ancho del menú del diseño nuevo (CAR-442)", () => {
  it("solo acepta un ancho entre 200 y 330 px", () => {
    expect(anchoMenuDeCookie("280")).toBe(280);
    expect(anchoMenuDeCookie("200")).toBe(200);
    expect(anchoMenuDeCookie("330")).toBe(330);
    for (const malo of [undefined, "", "199", "331", "abc", "2800", "28.5"])
      expect(anchoMenuDeCookie(malo)).toBeUndefined();
  });

  it("guarda el ancho redondeado y dentro de los límites, por un año", () => {
    expect(cookieAnchoMenu(281.6)).toContain(`${COOKIE_ANCHO_MENU}=282; Path=/; Max-Age=31536000`);
    expect(cookieAnchoMenu(900)).toContain(`${COOKIE_ANCHO_MENU}=330;`);
    expect(cookieAnchoMenu(10)).toContain(`${COOKIE_ANCHO_MENU}=200;`);
  });
});

describe("menú de la cuenta con Configuración (CAR-442)", () => {
  it("lleva a Configuración solo si la persona tiene acceso", () => {
    const nada = () => undefined;
    const ids = (conf: boolean) =>
      menuCuentaShell(true, nada, nada, true, undefined, undefined, undefined, conf).map(
        (i) => i.id,
      );
    expect(ids(true)).toContain("configuracion");
    expect(ids(false)).not.toContain("configuracion");
  });
});
