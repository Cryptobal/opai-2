// CAR-78 · E1: la lista blanca del servidor y la política de la cola del teléfono no pueden desalinearse.
import { esTipoEncolable, TIPOS_ENCOLABLES_OFFLINE } from "@opai/domain";
import { describe, expect, it } from "vitest";

import { TIPOS_HECHO_TERRENO, tipoPermitido } from "../src/core/terreno/hechos-tipos";

describe("política de tipos de la cola de Terreno", () => {
  it("todo tipo que el teléfono encola lo acepta el servidor, y al revés", () => {
    expect([...TIPOS_ENCOLABLES_OFFLINE].sort()).toEqual(Object.keys(TIPOS_HECHO_TERRENO).sort());
    for (const t of TIPOS_ENCOLABLES_OFFLINE) {
      expect(esTipoEncolable(t)).toBe(true);
      expect(tipoPermitido(t)).toBe(true);
    }
  });

  it("el servidor rechaza un tipo que exige sesión en línea aunque alguien lo declare", () => {
    expect(tipoPermitido("asistencia.marca.facial")).toBe(false);
    expect(tipoPermitido("asistencia.prueba_vida")).toBe(false);
    expect(tipoPermitido("inexistente")).toBe(false);
  });
});
