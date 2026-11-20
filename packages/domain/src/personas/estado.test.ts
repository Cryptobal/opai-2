import { describe, expect, it } from "vitest";

import {
  PERSONA_ESTADO_ACTIVO,
  puedeTransicionarPersona,
  TRANSICIONES_PERSONA,
} from "./estado";

describe("personas.estado (CAR-674)", () => {
  it("solo permite las transiciones de ADR-083 ampliado", () => {
    for (const [desde, destinos] of Object.entries(TRANSICIONES_PERSONA)) {
      for (const hacia of destinos) {
        expect(puedeTransicionarPersona(desde, hacia), `${desde} → ${hacia}`).toBe(true);
      }
    }
    expect(puedeTransicionarPersona("postulante", "rechazado")).toBe(true);
    expect(puedeTransicionarPersona("postulante", "en_evaluacion")).toBe(true);
    expect(puedeTransicionarPersona("en_evaluacion", "activo")).toBe(true);
    expect(puedeTransicionarPersona("externo", "activo")).toBe(true);
    expect(puedeTransicionarPersona("activo", "inactivo")).toBe(true);
    expect(puedeTransicionarPersona("inactivo", "externo")).toBe(true);
    expect(puedeTransicionarPersona("rechazado", "activo")).toBe(false);
    expect(puedeTransicionarPersona("postulante", "inactivo")).toBe(true);
    expect(puedeTransicionarPersona("rechazado", "inactivo")).toBe(false);
    expect(puedeTransicionarPersona("bloqueado_permanente", PERSONA_ESTADO_ACTIVO)).toBe(false);
    expect(puedeTransicionarPersona("activo", "postulante")).toBe(false);
  });
});