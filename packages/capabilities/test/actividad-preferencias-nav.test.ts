import { describe, expect, it } from "vitest";

import { ocultarPreferenciaNav } from "../src/core/panel/actividad-preferencias-nav";

describe("actividad preferencias de navegación", () => {
  it("oculta core.config.set de claves navegacion_*", () => {
    expect(
      ocultarPreferenciaNav({
        capability: "core.config.set",
        payload: { input: { clave: "navegacion_area_abierta", valor: "comercial" } },
      }),
    ).toBe(true);
    expect(
      ocultarPreferenciaNav({
        capability: "core.config.set",
        payload: { input: { clave: "tema", valor: "oscuro" } },
      }),
    ).toBe(false);
    expect(
      ocultarPreferenciaNav({
        capability: "core.cuentas.update",
        payload: { input: { id: "x" } },
      }),
    ).toBe(false);
  });
});
