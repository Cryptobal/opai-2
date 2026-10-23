import { ROLES } from "@opai/domain";
import { describe, expect, it } from "vitest";

import {
  ACCIONES,
  permisosPorRol,
} from "@/app/(erp)/configuracion/usuarios/matriz-datos";

describe("matriz de permisos en teléfono", () => {
  it("cada rol lista solo acciones que existen en la matriz", () => {
    const etiquetas = new Set(ACCIONES.map((a) => a.etiqueta));
    for (const r of ROLES) for (const e of permisosPorRol(r)) expect(etiquetas.has(e)).toBe(true);
  });
  it("el owner puede todo lo que muestra la matriz", () => {
    expect(permisosPorRol("owner")).toHaveLength(ACCIONES.length);
  });
});
