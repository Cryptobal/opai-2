import { describe, expect, it } from "vitest";

import { ROLES } from "./permisos";
import type { Rol } from "./permisos";
import {
  esMembresiaDeCliente,
  esPortalCoherente,
  PORTALES_TENANT,
  portalesAdmitidos,
  portalesIncoherentes,
} from "./portales";

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
