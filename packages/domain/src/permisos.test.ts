import { describe, expect, it } from "vitest";

import {
  coincide,
  esRol,
  permisosDe,
  puedeAsignarRol,
  type Rol,
  ROLES,
  tienePermiso,
  tienePermisoPlataforma,
} from "./permisos";

// Tabla rol × permiso esperada (ADR-016). true = tiene el permiso.
const TABLA: Record<string, Record<Rol, boolean>> = {
  "core:tenant.read": { owner: true, admin: true, gerente: true, supervisor: true, viewer: true },
  "core:tenant.manage": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
  "core:tenant.delete": {
    owner: true,
    admin: false,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
  "core:users.read": { owner: true, admin: true, gerente: true, supervisor: false, viewer: true },
  "core:users.manage": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
  "core:owners.manage": {
    owner: true,
    admin: false,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
  "core:apikeys.manage": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
  "comercial:negocios.read": { owner: true, admin: true, gerente: true, supervisor: false, viewer: true },
  "comercial:negocios.manage": { owner: true, admin: true, gerente: true, supervisor: false, viewer: false },
  // Embudo y catálogos: solo owner y admin (BRIEF-07, comercial.md §7).
  "comercial:config.manage": { owner: true, admin: true, gerente: false, supervisor: false, viewer: false },
  "ops:write": { owner: true, admin: true, gerente: true, supervisor: true, viewer: false },
  "rondas:write": { owner: true, admin: true, gerente: true, supervisor: true, viewer: false },
  "personas:read": { owner: true, admin: true, gerente: true, supervisor: true, viewer: true },
  "personas:write": { owner: true, admin: true, gerente: true, supervisor: false, viewer: false },
  "finanzas:read": { owner: true, admin: true, gerente: false, supervisor: false, viewer: false },
  "finanzas:dte.emit": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
  "nomina:read": { owner: true, admin: true, gerente: false, supervisor: false, viewer: false },
  "nomina:liquidacion.read": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
};

describe("tienePermiso", () => {
  for (const [permiso, porRol] of Object.entries(TABLA)) {
    for (const rol of ROLES) {
      it(`${rol} ${porRol[rol] ? "tiene" : "no tiene"} ${permiso}`, () => {
        expect(tienePermiso(rol, permiso)).toBe(porRol[rol]);
      });
    }
  }

  it("bloqueo financiero: gerente, supervisor y viewer nunca tienen finanzas:* ni nomina:*", () => {
    for (const rol of ["gerente", "supervisor", "viewer"] as const) {
      for (const p of ["finanzas:read", "finanzas:x.y", "nomina:write", "nomina:a.b.c"]) {
        expect(tienePermiso(rol, p)).toBe(false);
      }
    }
  });

  it("ningún rol del tenant obtiene permisos de plataforma", () => {
    for (const rol of ROLES) expect(tienePermiso(rol, "platform:tenants.read")).toBe(false);
  });
});

describe("tienePermisoPlataforma", () => {
  it("owner tiene todo platform:*; support solo lectura; null nada", () => {
    expect(tienePermisoPlataforma("owner", "platform:tenants.manage")).toBe(true);
    expect(tienePermisoPlataforma("support", "platform:tenants.read")).toBe(true);
    expect(tienePermisoPlataforma("support", "platform:tenants.manage")).toBe(false);
    expect(tienePermisoPlataforma(null, "platform:tenants.read")).toBe(false);
  });

  it("no otorga permisos de tenant", () => {
    expect(tienePermisoPlataforma("owner", "core:users.manage")).toBe(false);
  });
});

describe("comodines", () => {
  it("* coincide con cualquier secuencia y el resto es literal", () => {
    expect(coincide("*", "comercial:negocio.create")).toBe(true);
    expect(coincide("comercial:*", "comercial:negocio.create")).toBe(true);
    expect(coincide("comercial:*", "cpq:read")).toBe(false);
    expect(coincide("*:read", "comercial:read")).toBe(true);
    expect(coincide("*:read", "comercial:negocio.read")).toBe(false);
    expect(coincide("*:*.read", "comercial:negocio.read")).toBe(true);
    expect(coincide("core:tenant.read", "core:tenantxread")).toBe(false);
  });
});

describe("permisosDe", () => {
  const catalogo = ["core:tenant.read", "core:users.manage", "comercial:read", "finanzas:read"];

  it("filtra por rol y por módulos activos (core siempre activo)", () => {
    expect(permisosDe("admin", catalogo, ["comercial"])).toEqual([
      "core:tenant.read",
      "core:users.manage",
      "comercial:read",
    ]);
    expect(permisosDe("viewer", catalogo, ["comercial", "finanzas"])).toEqual([
      "core:tenant.read",
      "comercial:read",
    ]);
  });
});

describe("roles", () => {
  it("esRol valida", () => {
    expect(esRol("gerente")).toBe(true);
    expect(esRol("root")).toBe(false);
  });

  it("nadie asigna un rol superior al propio y owner solo lo asigna un owner", () => {
    expect(puedeAsignarRol("owner", "owner")).toBe(true);
    expect(puedeAsignarRol("admin", "owner")).toBe(false);
    expect(puedeAsignarRol("admin", "admin")).toBe(true);
    expect(puedeAsignarRol("gerente", "admin")).toBe(false);
  });
});

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
    expect(de("gerente")).toEqual(["cpq:cotizaciones.read", "cpq:cotizaciones.manage", "cpq:costos.ver"]);
    expect(tienePermiso("gerente", "core:estructuras.read_sensible")).toBe(false);
  });

  it("viewer solo lee cotizaciones, sin costos (R59); supervisor nada", () => {
    expect(de("viewer")).toEqual(["cpq:cotizaciones.read"]);
    expect(de("supervisor")).toEqual([]);
  });
});
