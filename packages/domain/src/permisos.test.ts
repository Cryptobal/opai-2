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
  // CPQ (CAR-119, cpq.md §7): el gerente ve costos y gestiona, pero no aprueba ni configura el modelo.
  "cpq:cotizaciones.manage": { owner: true, admin: true, gerente: true, supervisor: false, viewer: false },
  "cpq:cotizaciones.read": { owner: true, admin: true, gerente: true, supervisor: false, viewer: true },
  "cpq:costos.ver": { owner: true, admin: true, gerente: true, supervisor: false, viewer: false },
  "cpq:aprobar": { owner: true, admin: true, gerente: false, supervisor: false, viewer: false },
  "cpq:modelo.manage": { owner: true, admin: true, gerente: false, supervisor: false, viewer: false },
  "cpq:biblioteca.manage": { owner: true, admin: true, gerente: false, supervisor: false, viewer: false },
  "cpq:envios.aprobar": { owner: true, admin: true, gerente: false, supervisor: false, viewer: false },
  // Leads (BRIEF-07-leads): solicitudes para owner/admin/gerente; canales solo owner/admin.
  "comercial:solicitudes.read": {
    owner: true,
    admin: true,
    gerente: true,
    supervisor: false,
    viewer: false,
  },
  "comercial:solicitudes.manage": {
    owner: true,
    admin: true,
    gerente: true,
    supervisor: false,
    viewer: false,
  },
  "comercial:canales.manage": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
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
  "comercial:negocios.read": {
    owner: true,
    admin: true,
    gerente: true,
    supervisor: false,
    viewer: true,
  },
  "comercial:negocios.manage": {
    owner: true,
    admin: true,
    gerente: true,
    supervisor: false,
    viewer: false,
  },
  // Embudo y catálogos: solo owner y admin (BRIEF-07, comercial.md §7).
  "comercial:config.manage": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
  "ops:write": { owner: true, admin: true, gerente: true, supervisor: true, viewer: false },
  "rondas:write": { owner: true, admin: true, gerente: true, supervisor: true, viewer: false },
  "personas:read": { owner: true, admin: true, gerente: true, supervisor: true, viewer: true },
  "personas:write": { owner: true, admin: true, gerente: true, supervisor: false, viewer: false },
  // Marca P1 "No recontratar" (Personas y Cargos PR 1): solo owner y admin por defecto.
  "core:personas.no_recontratar.manage": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
  "core:personas.prevision.read": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: true,
    viewer: false,
  },
  "core:personas.prevision.manage": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
  "core:personas.pago.read": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: true,
    viewer: false,
  },
  "core:personas.pago.manage": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
  "core:personas.pago.aprobar": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
  "core:personas.laboral.read": {
    owner: true,
    admin: true,
    gerente: true,
    supervisor: true,
    viewer: false,
  },
  "core:personas.laboral.manage": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
  "finanzas:read": { owner: true, admin: true, gerente: false, supervisor: false, viewer: false },
  "finanzas:ventas.configure": {
    owner: true,
    admin: true,
    gerente: false,
    supervisor: false,
    viewer: false,
  },
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

  it("un rol personalizado con core:* hereda la marca P1 sin listarla aparte (no bloqueante del Revisor)", () => {
    expect(coincide("core:*", "core:personas.no_recontratar.manage")).toBe(true);
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
