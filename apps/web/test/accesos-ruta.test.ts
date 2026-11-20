import { describe, expect, it } from "vitest";

import { rutaAccesos } from "@/app/(erp)/accesos/_componentes/ruta-accesos";

describe("rutaAccesos: navegación sin dependencias de acciones", () => {
  it("conserva filtros y sustituye el cursor al paginar", () => {
    const ruta = rutaAccesos(
      "/accesos/prerregistros",
      {
        instalacion: "qa-instalacion",
        tipo: "visita",
        motivo: "reunión",
        cursor: "anterior",
        q: "Visita ficticia",
      },
      { cursor: "siguiente" },
    );
    const url = new URL(ruta, "http://localhost");
    expect(url.pathname).toBe("/accesos/prerregistros");
    for (const [k, v] of Object.entries({
      instalacion: "qa-instalacion",
      tipo: "visita",
      motivo: "reunión",
      cursor: "siguiente",
      q: "Visita ficticia",
    }))
      expect(url.searchParams.get(k)).toBe(v);
  });
  it("no añade parámetros ausentes", () => {
    expect(rutaAccesos("/accesos/intentos", {})).toBe("/accesos/intentos");
  });
});
