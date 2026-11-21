import { describe, expect, it } from "vitest";

import { ROLES } from "./permisos";
import type { Rol } from "./permisos";
import {
  esMembresiaDeCliente,
  esMembresiaPortalTrabajador,
  esPortalCoherente,
  idsPortalesUsables,
  puedeUsarPortal,
  PORTALES_TENANT,
  portalesAdmitidos,
  portalesIncoherentes,
  type ContextoPortalesVisibles,
} from "./portales";

const base = (extra: Partial<ContextoPortalesVisibles> = {}): ContextoPortalesVisibles => ({
  portalesMembresia: ["erp", "supervisor", "trabajador", "terreno", "cliente"],
  rol: "owner",
  platformRole: null,
  modulosActivos: ["portal_trabajador"],
  instalaciones: null,
  personaVinculada: true,
  ...extra,
});

describe("coherencia rol-portal (NÚCLEO-D1)", () => {
  it("cliente nunca es coherente con un rol de membresía, exista el rol que exista", () => {
    for (const rol of ROLES) {
      expect(portalesIncoherentes(rol, ["erp", "cliente"])).toEqual(["cliente"]);
      expect(esPortalCoherente(rol, ["erp", "cliente"])).toBe(false);
    }
  });

  it("erp, supervisor, trabajador y terreno son coherentes hoy con cualquier rol", () => {
    const sinCliente = PORTALES_TENANT.filter((p) => p !== "cliente");
    for (const rol of ROLES) {
      expect(portalesIncoherentes(rol, sinCliente)).toEqual([]);
      expect(esPortalCoherente(rol, sinCliente)).toBe(true);
    }
  });

  it("el trabajador del portal es viewer con solo trabajador o terreno (CAR-803)", () => {
    expect(esMembresiaPortalTrabajador("viewer", ["trabajador"])).toBe(true);
    expect(esMembresiaPortalTrabajador("viewer", ["trabajador", "terreno"])).toBe(true);
    expect(esMembresiaPortalTrabajador("viewer", ["erp", "trabajador"])).toBe(false);
    expect(esMembresiaPortalTrabajador("owner", ["trabajador"])).toBe(false);
  });

  it("el contacto de un cliente es viewer con «cliente» como único portal (CAR-88)", () => {
    expect(portalesIncoherentes("viewer", ["cliente"])).toEqual([]);
    expect(esMembresiaDeCliente("viewer", ["cliente"])).toBe(true);
    for (const rol of ROLES.filter((r) => r !== "viewer")) {
      expect(portalesIncoherentes(rol, ["cliente"])).toEqual(["cliente"]);
      expect(esMembresiaDeCliente(rol, ["cliente"])).toBe(false);
    }
    expect(esMembresiaDeCliente("viewer", ["cliente", "erp"])).toBe(false);
    expect(esMembresiaDeCliente("viewer", [])).toBe(false);
  });

  it("lista solo los incoherentes, no vacía la selección entera", () => {
    const rol: Rol = "viewer";
    expect(portalesIncoherentes(rol, ["erp", "cliente", "supervisor"])).toEqual(["cliente"]);
  });
  it("ningún rol del tenant concede Plataforma ni portales desconocidos", () => {
    for (const rol of ROLES)
      expect(portalesIncoherentes(rol, ["platform", "inventado"])).toEqual([
        "platform",
        "inventado",
      ]);
  });
  it("los principales externos solo admiten su portal (ADR-033)", () => {
    for (const rol of ROLES) {
      expect(portalesAdmitidos(rol, "cuenta")).toEqual(["cliente"]);
      expect(portalesAdmitidos(rol, "persona")).toEqual(["trabajador"]);
    }
  });
});

describe("portales usables en el selector (CAR-746)", () => {
  it("admin de empresa: ERP y Plataforma con rol global, sin Cliente ni Terreno", () => {
    const c = base({
      rol: "admin",
      portalesMembresia: ["erp", "cliente", "supervisor", "terreno"],
      platformRole: "support",
    });
    expect(idsPortalesUsables(c).sort()).toEqual(["erp", "platform"]);
    expect(puedeUsarPortal("cliente", c)).toBe(false);
    expect(puedeUsarPortal("terreno", c)).toBe(false);
    expect(puedeUsarPortal("supervisor", c)).toBe(false);
  });

  it("supervisor: ERP y Supervisor", () => {
    const c = base({
      rol: "supervisor",
      portalesMembresia: ["erp", "supervisor"],
      instalaciones: ["inst-1"],
    });
    expect(idsPortalesUsables(c).sort()).toEqual(["erp", "supervisor"]);
  });

  it("contacto de cliente: solo Cliente, sin selector de empresa", () => {
    const c = base({
      rol: "viewer",
      portalesMembresia: ["cliente"],
      instalaciones: ["inst-cliente"],
    });
    expect(idsPortalesUsables(c)).toEqual(["cliente"]);
  });

  it("trabajador con persona vinculada: solo Trabajador", () => {
    const c = base({
      rol: "viewer",
      portalesMembresia: ["trabajador"],
      modulosActivos: ["portal_trabajador"],
      personaVinculada: true,
    });
    expect(idsPortalesUsables(c)).toEqual(["trabajador"]);
    expect(idsPortalesUsables({ ...c, personaVinculada: false })).toEqual([]);
  });
});
