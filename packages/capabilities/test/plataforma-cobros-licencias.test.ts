// CAR-323 (D.2, decisión de Carlos del 12-nov-2026): «usuario con licencia» = cualquier usuario con algún
// permiso efectivo del módulo, contando roles personalizados y excepciones. Sin permisos, no cuenta.
import { describe, expect, it } from "vitest";

import { contarUnidades, type DatosUnidades } from "../src/core/plataforma/cobros/unidades";
import { catalogoPermisos } from "../src/core/me";

type Miembro = DatosUnidades["miembros"][number];
const base = (m: Partial<Miembro>): Miembro => ({
  rol: "viewer",
  roleId: null,
  rolTenant: null,
  excepciones: [],
  ...m,
});
const contar = (miembros: Miembro[], modulo: string) =>
  contarUnidades({ miembros, trabajadores: 0, instalaciones: 0 }, "usuario_licencia", modulo);

describe("usuario con licencia", () => {
  // Un permiso real del catálogo del núcleo, para no depender de los módulos registrados.
  const permiso = catalogoPermisos().find((p) => p.startsWith("core:"));

  it("cuenta rol de sistema, rol personalizado y excepción que concede", () => {
    expect(permiso).toBeDefined();
    const p = permiso as string;
    const miembros = [
      base({ rol: "owner" }),
      base({ roleId: "r1", rolTenant: { permisos: [p] } }),
      base({
        roleId: "r2",
        rolTenant: { permisos: [] },
        excepciones: [{ permiso: p, conceder: true }],
      }),
    ];
    expect(contar(miembros, "core")).toBe(3);
  });

  it("no cuenta a quien no tiene ningún permiso efectivo del módulo", () => {
    const p = permiso as string;
    const sinNada = base({ roleId: "r3", rolTenant: { permisos: [] } });
    const negado = base({
      roleId: "r4",
      rolTenant: { permisos: [p] },
      excepciones: [{ permiso: p, conceder: false }],
    });
    expect(contar([sinNada], "core")).toBe(0);
    // La excepción que deniega gana sobre el rol: si era su único permiso del módulo, deja de contar.
    expect(contar([negado], "core")).toBe(0);
    // Un permiso de otro módulo no da licencia en este.
    expect(contar([base({ roleId: "r5", rolTenant: { permisos: [p] } })], "comercial")).toBe(0);
  });
});
