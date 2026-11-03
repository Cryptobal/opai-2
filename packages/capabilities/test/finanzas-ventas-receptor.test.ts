import { describe, expect, it } from "vitest";

import { receptorDteDe } from "../src/finanzas/ventas-comun";

describe("receptorDteDe", () => {
  it("prioriza razón social y expone tributarios de la cuenta", () => {
    expect(
      receptorDteDe({
        nombre: "Fantasía Ltda.",
        razonSocial: "Cliente Facturación SpA",
        giro: "Servicios de seguridad",
        calle: "Av. Apoquindo 100",
        comuna: "Las Condes",
        ciudad: "Santiago",
        emailDte: "dte@cliente.cl",
      }),
    ).toEqual({
      razonSocialReceptor: "Cliente Facturación SpA",
      giroReceptor: "Servicios de seguridad",
      direccionReceptor: "Av. Apoquindo 100",
      comunaReceptor: "Las Condes",
      ciudadReceptor: "Santiago",
      emailReceptor: "dte@cliente.cl",
    });
  });

  it("usa el nombre comercial si no hay razón social", () => {
    expect(
      receptorDteDe({
        nombre: "Solo Nombre SpA",
        razonSocial: null,
        giro: null,
        calle: null,
        comuna: null,
        ciudad: null,
        emailDte: null,
      }).razonSocialReceptor,
    ).toBe("Solo Nombre SpA");
  });
});
