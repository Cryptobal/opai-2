import { describe, expect, it } from "vitest";

import { esIdInvalido } from "@/lib/rutas-invalidas";

const UUID = "01a166f3-ce42-72d8-a664-77755f23606c";

describe("ids inválidos en la URL (404 real desde el proxy)", () => {
  it("detecta ids que no son UUID en las fichas", () => {
    for (const r of ["/personas/abc", "/cuentas/123", `/instalaciones/x/puestos`, "/cargos/zzz"])
      expect(esIdInvalido(r), r).toBe(true);
  });

  it("deja pasar UUID, listas y rutas fijas", () => {
    for (const r of [
      "/personas",
      `/personas/${UUID}`,
      `/cuentas/${UUID}/contactos`,
      "/personas/vencimientos",
      "/instalaciones/nueva",
      "/configuracion/usuarios",
      "/",
    ])
      expect(esIdInvalido(r), r).toBe(false);
  });
});
