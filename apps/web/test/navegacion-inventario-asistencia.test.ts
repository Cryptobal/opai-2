import { beforeAll, describe, expect, it } from "vitest";

import { vocabulario } from "@opai/domain";

import { icono } from "@/app/_components/iconos";
import { navegacionErp } from "@/lib/navegacion";
import { asegurarRegistro } from "@/lib/registro";

beforeAll(() => asegurarRegistro());

describe("Inventario y Asistencia en el menú del ERP", () => {
  const activos = ["comercial", "cpq", "pauta", "tickets", "nomina", "finanzas", "acceso", "asistencia", "inventario"];
  const conPermisos = (puede: (permiso: string) => boolean, modulos = activos) =>
    navegacionErp("owner", puede, modulos, vocabulario("seguridad")).nav;

  it("mantiene Inventario en Operaciones y Asistencia y Marcas juntas en Personas", () => {
    const nav = conPermisos(() => true);
    expect(nav.find((n) => n.href === "/inventario")).toMatchObject({
      area: "operaciones",
      icono: "Boxes",
    });
    expect(nav.filter((n) => n.area === "personas").map((n) => n.href)).toEqual([
      "/personas", "/asistencia", "/asistencia/marcas", "/remuneraciones",
    ]);
    expect(icono("Boxes")).not.toBe(icono("__desconocido"));
    expect(icono("Fingerprint")).not.toBe(icono("__desconocido"));
    const iconos = nav.map((n) => n.icono);
    expect(new Set(iconos).size).toBe(iconos.length);
  });

  it("filtra Inventario y Asistencia por sus propios permisos y módulos activos", () => {
    const sinInventario = conPermisos((p) => p !== "inventario:read").map((n) => n.href);
    expect(sinInventario).not.toContain("/inventario");
    expect(sinInventario).toContain("/asistencia/marcas");
    const sinAsistencia = conPermisos((p) => p !== "asistencia:ver").map((n) => n.href);
    expect(sinAsistencia).toContain("/inventario");
    expect(sinAsistencia).not.toContain("/asistencia");
    expect(sinAsistencia).not.toContain("/asistencia/marcas");
    const sinModuloInventario = conPermisos(() => true, activos.filter((m) => m !== "inventario"));
    expect(sinModuloInventario.some((n) => n.href === "/inventario")).toBe(false);
  });
});
