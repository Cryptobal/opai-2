import { describe, expect, it } from "vitest";

import { manifest } from "./manifest";

describe("nomina · manifest", () => {
  const permisos = new Set(manifest.permisos.map((p) => p.id));

  it("toda capacidad exige un permiso declarado en el módulo", () => {
    for (const c of manifest.capacidades) {
      expect(c.id.startsWith("nomina."), c.id).toBe(true);
      expect(c.permiso && permisos.has(c.permiso), `${c.id} → ${c.permiso}`).toBe(true);
    }
  });

  it("los permisos son del módulo y la navegación exige uno declarado", () => {
    for (const p of permisos) expect(p.startsWith("nomina:")).toBe(true);
    for (const n of manifest.navegacion) expect(n.permiso && permisos.has(n.permiso)).toBe(true);
  });

  it("toda escritura admite dryRun y lo irreversible es solo marcar pagado", () => {
    for (const c of manifest.capacidades.filter((x) => x.efecto !== "lectura")) expect(c.dryRun, c.id).toBe(true);
    expect(manifest.capacidades.filter((x) => x.efecto === "irreversible").map((x) => x.id)).toEqual([
      "nomina.periodos.marcar_pagado",
    ]);
  });

  it("las lecturas de datos por persona se auditan", () => {
    for (const id of ["nomina.novedades.listar", "nomina.prestamos.listar", "nomina.anticipos.reglas_listar"])
      expect(manifest.capacidades.find((c) => c.id === id)?.auditarLectura, id).toBeTypeOf("function");
  });
});
