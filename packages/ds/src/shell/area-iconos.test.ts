import { describe, expect, it } from "vitest";

import { iconoDeArea } from "./area-iconos";

describe("iconoDeArea", () => {
  it("cada área de la lista cerrada tiene su icono y una desconocida cae en la carpeta", () => {
    const carpeta = iconoDeArea("inventada");
    expect(iconoDeArea(undefined)).toBe(carpeta);
    for (const area of ["comercial", "operaciones", "personas", "finanzas", "documentos", "clientes"]) {
      expect(iconoDeArea(area)).not.toBe(carpeta);
    }
  });
});
