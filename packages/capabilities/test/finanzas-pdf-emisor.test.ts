import { describe, expect, it } from "vitest";

import { emisorDePerfil } from "../src/finanzas/ventas-pdf-doc";

describe("emisor del PDF desde el perfil de la empresa", () => {
  it("usa los datos cargados y recorta espacios", () => {
    expect(
      emisorDePerfil({ razonSocial: " Empresa Ficticia SpA ", giro: "Servicios de seguridad", calle: "Calle Falsa 123", comuna: "Santiago", telefono: "+56 2 2345 6789" }, "Nombre", "76000000-0"),
    ).toEqual({ razon: "Empresa Ficticia SpA", rut: "76000000-0", giro: "Servicios de seguridad", direccion: "Calle Falsa 123", comuna: "Santiago", fono: "+56 2 2345 6789" });
  });
  it("sin perfil usa el nombre de la empresa y no inventa nada", () => {
    expect(emisorDePerfil(null, "Empresa QA", "76000000-0")).toEqual({ razon: "Empresa QA", rut: "76000000-0" });
    expect(emisorDePerfil({ razonSocial: " ", giro: "", calle: null, comuna: "  ", telefono: null }, "Empresa QA", "1-9")).toEqual({ razon: "Empresa QA", rut: "1-9" });
  });
});
