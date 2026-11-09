// Contrato de paginación de core.cuentas.list (CAR-221): el máximo por página es 100. Pedir 200 falla por validación,
// con cualquier dato, y dejaba la pantalla «Nueva programación» en blanco. Las pantallas deben paginar por cursor.
import { describe, expect, it } from "vitest";

import { cuentasList } from "../src/core/maestros/cuentas";

describe("core.cuentas.list · límite por página", () => {
  it("acepta hasta 100 y rechaza 200", () => {
    expect(cuentasList.input.safeParse({ limite: 100 }).success).toBe(true);
    expect(cuentasList.input.safeParse({ limite: 101 }).success).toBe(false);
    expect(cuentasList.input.safeParse({ limite: 200 }).success).toBe(false);
  });
});
