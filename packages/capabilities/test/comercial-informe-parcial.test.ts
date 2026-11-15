import { describe, expect, it } from "vitest";

import { informeParcial } from "../src/comercial/informes-tablero";

// CAR-27 (pendiente de la autorrevisión): el tablero avisa cuando una fuente llegó al tope de filas.
describe("reportes comerciales · aviso de datos parciales", () => {
  it("es parcial solo si alguna fuente alcanza el tope; null (sin permiso de solicitudes) no cuenta", () => {
    expect(informeParcial([[1, 2], null], 3)).toBe(false);
    expect(informeParcial([[1, 2, 3], []], 3)).toBe(true);
    expect(informeParcial([null, [1, 2, 3, 4]], 3)).toBe(true);
  });
});
