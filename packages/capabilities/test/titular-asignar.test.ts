// CAR-206: contrato de pauta.titular.asignar y pauta.titulares.listar (sin base de datos).
import { describe, expect, it } from "vitest";

import { titularAsignar } from "../src/pauta/titular-asignar";
import { titularesListar } from "../src/pauta/titulares-listar";

const puestoId = "0198f2a0-0000-7000-8000-000000000001";
const personaId = "0198f2a0-0000-7000-8000-000000000002";

describe("pauta.titular.asignar · contrato", () => {
  it("exige pauta:write, acepta dryRun y la lectura pide pauta:read", () => {
    expect(titularAsignar.permiso).toBe("pauta:write");
    expect(titularAsignar.efecto).toBe("escritura");
    expect(titularAsignar.dryRun).toBe(true);
    expect(titularesListar.permiso).toBe("pauta:read");
    expect(titularesListar.efecto).toBe("lectura");
    expect(titularAsignar.descripcion.length).toBeGreaterThanOrEqual(40);
  });

  it("valida el input: ids, fechas civiles reales y titular nulo para quitar", () => {
    const ok = titularAsignar.input.safeParse({ puestoId, titularPersonaId: personaId, desde: "2026-11-09", inicioCiclo: "2026-11-09" });
    expect(ok.success).toBe(true);
    expect(titularAsignar.input.safeParse({ puestoId, titularPersonaId: null, desde: "2026-11-09" }).success).toBe(true);
    expect(titularAsignar.input.safeParse({ puestoId: "x", titularPersonaId: null, desde: "2026-11-09" }).success).toBe(false);
    expect(titularAsignar.input.safeParse({ puestoId, titularPersonaId: personaId, desde: "2026-02-30" }).success).toBe(false);
    expect(titularAsignar.input.safeParse({ puestoId, desde: "2026-11-09" }).success).toBe(false);
  });
});
