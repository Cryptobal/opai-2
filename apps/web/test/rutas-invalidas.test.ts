import { describe, expect, it } from "vitest";

import { destino404, esIdInvalido } from "@/lib/rutas-invalidas";

const UUID = "01a166f3-ce42-72d8-a664-77755f23606c";

describe("ids inválidos en la URL (404 real desde el proxy)", () => {
  it("detecta ids que no son UUID en las fichas", () => {
    for (const r of [
      "/personas/abc",
      "/cuentas/123",
      `/instalaciones/x/puestos`,
      "/cargos/zzz",
      "/configuracion/agentes/xyz",
      "/supervisor/instalaciones/xyz",
      "/supervisor/personas/xyz",
    ])
      expect(esIdInvalido(r), r).toBe(true);
  });

  it("deja pasar UUID, listas y rutas fijas", () => {
    for (const r of [
      "/personas",
      `/personas/${UUID}`,
      `/cuentas/${UUID}/contactos`,
      "/personas/vencimientos",
      "/instalaciones/nueva",
      "/configuracion/agentes/conectar",
      `/supervisor/personas/${UUID}`,
      "/configuracion/usuarios",
      "/",
    ])
      expect(esIdInvalido(r), r).toBe(false);
  });
});

describe("a qué página se reescribe un 404", () => {
  it("cada portal usa la suya; el resto, la del ERP", () => {
    expect(destino404("/supervisor/personas/xyz")).toBe("/supervisor/no-encontrado");
    expect(destino404("/terreno/algo")).toBe("/terreno/no-encontrado");
    expect(destino404("/personas/abc")).toBe("/no-encontrado");
    expect(destino404("/configuracion/agentes/xyz")).toBe("/no-encontrado");
  });
});
