import { describe, expect, it } from "vitest";

import { ajustesNavegacion } from "../src/core/config/navegacion";

// CAR-335 D4c: vistas guardadas por persona y lista, en un ajuste de usuario (sin migración).
const esquema = ajustesNavegacion.navegacion_vistas_guardadas;

describe("vistas guardadas", () => {
  it("acepta vistas con nombre y filtros de la URL, por lista", () => {
    const v = { cuentas: [{ nombre: "Clientes activos", query: "?estado=cliente_activo" }] };
    expect(esquema.parse(v)).toEqual(v);
    expect(esquema.parse(undefined)).toEqual({});
  });

  it("rechaza rutas externas, nombres repetidos y más de 10 por lista", () => {
    expect(() => esquema.parse({ cuentas: [{ nombre: "x", query: "https://otro.cl" }] })).toThrow();
    expect(() =>
      esquema.parse({
        cuentas: [
          { nombre: "A", query: "" },
          { nombre: "A", query: "?q=b" },
        ],
      }),
    ).toThrow();
    const once = Array.from({ length: 11 }, (_, i) => ({ nombre: `V${i}`, query: "" }));
    expect(() => esquema.parse({ cuentas: once })).toThrow();
    expect(() => esquema.parse({ "../x": [] })).toThrow();
    expect(() => esquema.parse({ __proto__x: [] })).toThrow();
  });
});
