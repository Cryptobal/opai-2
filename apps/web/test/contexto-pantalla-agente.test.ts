import { describe, expect, it } from "vitest";

import {
  fijarFichaPrueba,
  solicitudDesdePantalla,
} from "@/app/_components/agente/contexto-pantalla-agente";

// CAR-547: el shell lee la ficha que registró la pantalla.
describe("contexto de pantalla del agente", () => {
  it("sin ficha registrada no manda contexto", () => {
    fijarFichaPrueba(null);
    expect(solicitudDesdePantalla()).toEqual({});
  });

  it("expone tipo, id y nombre de la ficha visible", () => {
    fijarFichaPrueba({
      contexto: { tipo: "cuenta", id: "qa-cuenta-1" },
      etiqueta: "Empresa demo",
    });
    expect(solicitudDesdePantalla()).toEqual({
      contexto: { tipo: "cuenta", id: "qa-cuenta-1" },
      etiqueta: "Empresa demo",
    });
    fijarFichaPrueba(null);
  });
});