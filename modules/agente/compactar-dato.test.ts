import { describe, expect, it } from "vitest";

import { compactarDatoAgente } from "./compactar-dato";

describe("compactarDatoAgente (CAR-525)", () => {
  it("quita lineas de los ítems y deja folio, cliente y href", () => {
    const dato = {
      items: [
        {
          folio: 100,
          cuentaNombre: "Acme SpA",
          href: "/finanzas/ventas/a",
          lineas: [{ id: "1", glosa: "Servicio", monto: 1000 }],
        },
      ],
      siguiente: null,
    };
    expect(compactarDatoAgente(dato)).toEqual({
      items: [{ folio: 100, cuentaNombre: "Acme SpA", href: "/finanzas/ventas/a" }],
      siguiente: null,
    });
  });
});
