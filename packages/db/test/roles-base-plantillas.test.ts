// I1 de QA PR #60: el seed de roles plantilla debe actualizar idempotentemente los roles sembrados
// que el tenant no editó, sin pisar los que sí ajustó. Prueba pura (sin base) de la decisión.
import { describe, expect, it } from "vitest";

import { decidirAccionRol, PLANTILLAS } from "../scripts/roles-base-plantillas";

const inspector = PLANTILLAS.find((p) => p.nombre === "Inspector DT");
if (!inspector) throw new Error("Falta la plantilla «Inspector DT» en PLANTILLAS");

describe("decidirAccionRol (seed de roles plantilla)", () => {
  it("crea el rol cuando no existe", () => {
    expect(decidirAccionRol(null, inspector)).toBe("crear");
  });

  it("no reescribe un rol que ya tiene el conjunto canónico (idempotente)", () => {
    expect(decidirAccionRol({ permisos: [...inspector.permisos] }, inspector)).toBe("ya-al-dia");
    // El orden no importa: el mismo conjunto en otro orden sigue siendo «ya-al-dia».
    expect(decidirAccionRol({ permisos: [...inspector.permisos].reverse() }, inspector)).toBe(
      "ya-al-dia",
    );
  });

  it("actualiza el Inspector DT sembrado por una versión previa (I1): le faltaban sueldos y auditoría", () => {
    const previo = [
      "core:tenant.read",
      "core:instalaciones.read",
      "core:personas.read",
      "core:documentos.read",
    ];
    expect(decidirAccionRol({ permisos: previo }, inspector)).toBe("actualizar");
  });

  it("no pisa un rol que el tenant editó (conjunto desconocido)", () => {
    const editadoPorTenant = ["core:tenant.read", "core:personas.read", "core:cuentas.read"];
    expect(decidirAccionRol({ permisos: editadoPorTenant }, inspector)).toBe("editado-sin-tocar");
    // Tampoco pisa si el tenant le QUITÓ un permiso del canónico (no es un baseline conocido).
    const recortado = inspector.permisos.filter((p) => p !== "core:audit.read");
    expect(decidirAccionRol({ permisos: [...recortado] }, inspector)).toBe("editado-sin-tocar");
  });

  it("para los roles sin versión previa, un conjunto distinto al canónico se considera editado", () => {
    const rrhh = PLANTILLAS.find((p) => p.nombre === "RRHH");
    if (!rrhh) throw new Error("Falta «RRHH»");
    expect(decidirAccionRol({ permisos: [...rrhh.permisos] }, rrhh)).toBe("ya-al-dia");
    expect(decidirAccionRol({ permisos: ["core:tenant.read"] }, rrhh)).toBe("editado-sin-tocar");
  });

  it("el canónico del Inspector DT incluye sueldos y auditoría (decisión t74s350)", () => {
    expect(inspector.permisos).toContain("core:estructuras.read");
    expect(inspector.permisos).toContain("core:audit.read");
  });

  it("actualiza la versión del #60 a read_sensible sin conceder escrituras (t479u)", () => {
    const previo = inspector.permisos.filter((p) => p !== "core:estructuras.read_sensible");
    expect(decidirAccionRol({ permisos: previo }, inspector)).toBe("actualizar");
    expect(inspector.permisos).toContain("core:estructuras.read_sensible");
    expect(inspector.permisos.every((p) => /\.(read|read_sensible)$/.test(p))).toBe(true);
    expect(decidirAccionRol({ permisos: inspector.permisos }, inspector)).toBe("ya-al-dia");
  });
});
