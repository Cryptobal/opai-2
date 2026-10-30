import { describe, expect, it } from "vitest";

import { tienePermiso } from "../permisos";

describe("permisos de CPQ por rol (cpq.md §7)", () => {
  const CPQ = [
    "cpq:cotizaciones.read",
    "cpq:cotizaciones.manage",
    "cpq:costos.ver",
    "cpq:aprobar",
    "cpq:modelo.manage",
  ];
  const de = (rol: Parameters<typeof tienePermiso>[0]) => CPQ.filter((p) => tienePermiso(rol, p));

  it("owner y admin tienen los cinco", () => {
    expect(de("owner")).toEqual(CPQ);
    expect(de("admin")).toEqual(CPQ);
  });

  it("gerente ve costos pero no aprueba ni cambia el modelo (ADR-042 (5) y (8))", () => {
    expect(de("gerente")).toEqual([
      "cpq:cotizaciones.read",
      "cpq:cotizaciones.manage",
      "cpq:costos.ver",
    ]);
    expect(tienePermiso("gerente", "core:estructuras.read_sensible")).toBe(false);
  });

  it("viewer solo lee cotizaciones, sin costos (R59); supervisor nada", () => {
    expect(de("viewer")).toEqual(["cpq:cotizaciones.read"]);
    expect(de("supervisor")).toEqual([]);
  });
});
