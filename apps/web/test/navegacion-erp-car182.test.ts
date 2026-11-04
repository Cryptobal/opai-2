import { beforeAll, describe, expect, it } from "vitest";

import { vocabulario } from "@opai/domain";

import { SECCIONES } from "@/app/(erp)/configuracion/_centro/secciones";
import { navegacionErp } from "@/lib/navegacion";
import { asegurarRegistro } from "@/lib/registro";

/**
 * CAR-182: el menú del ERP con todos los módulos activos y todos los permisos. Bandeja una sola vez,
 * catálogos fuera del menú (Cargos, Folios, Configuración DTE, Plan de cuentas), Cuentas y Contactos
 * en Comercial, áreas en orden de uso y el área Documentos con el Explorador y Firmas.
 */
const MODULOS = ["comercial", "cpq", "pauta", "tickets", "nomina", "finanzas"];
const CATALOGOS = ["/cargos", "/finanzas/folios", "/finanzas/configuracion-dte", "/finanzas/plan-de-cuentas"];

beforeAll(() => asegurarRegistro());

const armar = () => navegacionErp("owner", () => true, MODULOS, vocabulario("seguridad"));

describe("menú del ERP (CAR-182)", () => {
  it("muestra la Bandeja una sola vez, justo después de Inicio", () => {
    const { nav } = armar();
    expect(nav.filter((n) => n.href === "/bandeja")).toHaveLength(1);
    expect(nav.slice(0, 2).map((n) => n.href)).toEqual(["/", "/bandeja"]);
  });

  it("deja los catálogos fuera del menú", () => {
    const hrefs = armar().nav.map((n) => n.href);
    for (const href of CATALOGOS) expect(hrefs, href).not.toContain(href);
  });

  it("ordena las áreas por uso y no deja un área «Clientes»", () => {
    const grupos = [...new Set(armar().nav.flatMap((n) => (n.grupo ? [n.grupo] : [])))];
    expect(grupos).toEqual(["Comercial", "Operaciones", "Personas", "Finanzas", "Documentos"]);
  });

  it("pone Cuentas y Contactos al final de Comercial", () => {
    const comercial = armar().nav.filter((n) => n.grupo === "Comercial").map((n) => n.href);
    expect(comercial.slice(0, 2)).toEqual(["/solicitudes", "/negocios"]);
    expect(comercial).toEqual(expect.arrayContaining(["/tareas", "/cotizaciones"]));
    expect(comercial.slice(-2)).toEqual(["/cuentas", "/contactos"]);
  });

  it("mantiene Remuneraciones en Personas y Firmas en Documentos", () => {
    const { nav } = armar();
    expect(nav.find((n) => n.href === "/remuneraciones")?.grupo).toBe("Personas");
    expect(nav.find((n) => n.href === "/documentos/firmas")?.grupo).toBe("Documentos");
  });

  it("pone el Explorador primero en Documentos, activo solo en su ruta, y Firmas después", () => {
    const documentos = armar().nav.filter((n) => n.grupo === "Documentos");
    expect(documentos.map((n) => [n.href, n.etiqueta])).toEqual([
      ["/documentos", "Explorador"],
      ["/documentos/firmas", "Firmas"],
    ]);
    // `/documentos/firmas` cuelga de `/documentos`: sin `exacta` se marcarían las dos entradas.
    expect(documentos[0]?.exacta).toBe(true);
    expect(documentos[1]?.exacta).toBeUndefined();
  });

  it("el Explorador exige documentos.read y Firmas firmas.read, cada uno por separado", () => {
    const sin = (p: string) =>
      navegacionErp("owner", (x) => x !== p, MODULOS, vocabulario("seguridad")).nav.map((n) => n.href);
    expect(sin("core:documentos.read")).not.toContain("/documentos");
    expect(sin("core:documentos.read")).toContain("/documentos/firmas");
    expect(sin("core:firmas.read")).toContain("/documentos");
    expect(sin("core:firmas.read")).not.toContain("/documentos/firmas");
  });
});

describe("catálogos en Configuración (CAR-182)", () => {
  it("Cargos en Operación, con el permiso de estructuras y su ruta de siempre", () => {
    const cargos = SECCIONES.find((s) => s.id === "cargos");
    expect(cargos).toMatchObject({ href: "/cargos", grupo: "operacion", permiso: "core:estructuras.read" });
    expect(cargos?.modulo).toBeUndefined();
  });

  it("Facturación electrónica y Folios en Empresa, solo con Finanzas activo", () => {
    for (const [id, href] of [
      ["facturacion-electronica", "/finanzas/configuracion-dte"],
      ["folios", "/finanzas/folios"],
    ] as const) {
      expect(SECCIONES.find((s) => s.id === id), id).toMatchObject({
        href,
        grupo: "empresa",
        permiso: "finanzas:ventas.configure",
        modulo: "finanzas",
      });
    }
  });
});
