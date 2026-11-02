import { describe, expect, it } from "vitest";

import { ROLES, tienePermiso } from "../permisos";

const PERMISOS_FINANZAS = [
  "finanzas:read",
  "finanzas:compras.manage",
  "finanzas:ventas.manage",
  "finanzas:proveedores.manage",
  "finanzas:plan.manage",
] as const;

describe("permisos de Finanzas (bloqueo financiero, ADR-016)", () => {
  it("owner y admin tienen todos", () => {
    for (const rol of ["owner", "admin"] as const)
      for (const p of PERMISOS_FINANZAS) expect(tienePermiso(rol, p), `${rol} ${p}`).toBe(true);
  });

  it("gerente, supervisor y viewer no tienen ninguno, ni siquiera la lectura", () => {
    for (const rol of ROLES.filter((r) => r !== "owner" && r !== "admin"))
      for (const p of PERMISOS_FINANZAS) expect(tienePermiso(rol, p), `${rol} ${p}`).toBe(false);
  });
});
