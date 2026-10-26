import { describe, expect, it } from "vitest";

import { tienePermiso } from "./permisos";
import {
  type Acceso,
  permisosEfectivos,
  permisosNoConcedibles,
  tienePermisoEfectivo,
} from "./permisos-efectivos";

describe("tienePermisoEfectivo", () => {
  it("un rol base sin excepciones se comporta igual que tienePermiso", () => {
    for (const permiso of ["core:tenant.read", "core:users.manage", "finanzas:read", "crm:write"]) {
      for (const rol of ["owner", "admin", "gerente", "supervisor", "viewer"] as const) {
        expect(tienePermisoEfectivo({ rol }, permiso)).toBe(tienePermiso(rol, permiso));
      }
    }
  });

  it("un rol personalizado concede solo los permisos de su lista (con comodines)", () => {
    const acceso: Acceso = { rol: null, permisosRol: ["core:cuentas.read", "ops:*"] };
    expect(tienePermisoEfectivo(acceso, "core:cuentas.read")).toBe(true);
    expect(tienePermisoEfectivo(acceso, "ops:turno.crear")).toBe(true);
    expect(tienePermisoEfectivo(acceso, "core:cuentas.manage")).toBe(false);
  });

  it("un rol personalizado vacío no da acceso", () => {
    expect(tienePermisoEfectivo({ rol: null, permisosRol: [] }, "core:cuentas.read")).toBe(false);
    expect(tienePermisoEfectivo({ rol: null }, "core:cuentas.read")).toBe(false);
  });

  it("un rol personalizado archivado deniega por defecto; no vuelve al rol base", () => {
    // El borde (fuentes.ts) mapea un rol personalizado archivado a `permisosRol: []` (deny-by-default),
    // nunca a los permisos del rol base. Con el rol base (sin lista) el mismo permiso sí se concede.
    expect(tienePermisoEfectivo({ rol: null, permisosRol: [] }, "core:instalaciones.read")).toBe(false);
    expect(tienePermisoEfectivo({ rol: "viewer", permisosRol: null }, "core:instalaciones.read")).toBe(
      true,
    );
  });

  it("una excepción que concede gana sobre el rol; una que deniega gana sobre todo", () => {
    // Concede finanzas a un gerente (lo permite un owner/admin, §16.2).
    expect(
      tienePermisoEfectivo(
        { rol: "gerente", excepciones: [{ permiso: "finanzas:read", conceder: true }] },
        "finanzas:read",
      ),
    ).toBe(true);
    // Deniega gana aunque el rol lo conceda y aunque haya una concesión del mismo permiso.
    expect(
      tienePermisoEfectivo(
        {
          rol: "admin",
          excepciones: [
            { permiso: "core:cuentas.manage", conceder: true },
            { permiso: "core:cuentas.manage", conceder: false },
          ],
        },
        "core:cuentas.manage",
      ),
    ).toBe(false);
  });

  it("platform:* nunca se obtiene por rol ni por excepción", () => {
    expect(
      tienePermisoEfectivo(
        { rol: null, permisosRol: ["platform:tenants.manage"] },
        "platform:tenants.manage",
      ),
    ).toBe(false);
    expect(
      tienePermisoEfectivo(
        { rol: "owner", excepciones: [{ permiso: "platform:tenants.read", conceder: true }] },
        "platform:tenants.read",
      ),
    ).toBe(false);
  });
});

describe("permisosEfectivos", () => {
  const catalogo = ["core:tenant.read", "core:cuentas.manage", "crm:read", "finanzas:read"];

  it("acota por módulos activos (core siempre) y aplica excepciones", () => {
    const acceso: Acceso = {
      rol: null,
      permisosRol: ["core:tenant.read", "crm:read", "finanzas:read"],
      excepciones: [{ permiso: "core:cuentas.manage", conceder: true }],
    };
    expect(permisosEfectivos(acceso, catalogo, ["crm"])).toEqual([
      "core:tenant.read",
      "core:cuentas.manage",
      "crm:read",
    ]);
  });
});

describe("permisosNoConcedibles", () => {
  const catalogo = ["core:cuentas.read", "core:cuentas.manage", "finanzas:read", "nomina:read"];
  const concedeAdmin = (p: string) => tienePermiso("admin", p);
  const concedeGerente = (p: string) => tienePermiso("gerente", p);

  it("un admin puede conceder finanzas y nómina (las tiene)", () => {
    expect(permisosNoConcedibles(concedeAdmin, ["finanzas:read", "nomina:read"], catalogo)).toEqual(
      [],
    );
  });

  it("un gerente no puede conceder finanzas ni nómina (no las tiene)", () => {
    expect(
      permisosNoConcedibles(concedeGerente, ["core:cuentas.read", "finanzas:read"], catalogo),
    ).toEqual(["finanzas:read"]);
  });
});
