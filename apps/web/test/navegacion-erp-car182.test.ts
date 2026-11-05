import { beforeAll, describe, expect, it } from "vitest";

import { vocabulario } from "@opai/domain";

import { SECCIONES } from "@/app/(erp)/configuracion/_centro/secciones";
import { icono } from "@/app/_components/iconos";
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

describe("menú del ERP sin duplicados ni ítems fuera de su área (CAR-182)", () => {
  it("ninguna ruta se repite en la barra lateral", () => {
    const hrefs = armar().nav.map((n) => n.href);
    expect(hrefs.filter((h, i) => hrefs.indexOf(h) !== i)).toEqual([]);
  });

  it("ningún ítem de área aparece también como entrada suelta y la Bandeja no tiene área", () => {
    const { nav } = armar();
    expect(nav.find((n) => n.href === "/bandeja")).toMatchObject({ icono: "Inbox" });
    expect(nav.find((n) => n.href === "/bandeja")?.grupo).toBeUndefined();
    for (const n of nav.filter((x) => x.grupo)) expect(n.area, n.href).toBeDefined();
  });

  it("cada ítem queda en el área que le corresponde", () => {
    const { nav } = armar();
    const grupoDe = (href: string) => nav.find((n) => n.href === href)?.grupo;
    expect(grupoDe("/remuneraciones")).toBe("Personas");
    expect(grupoDe("/documentos/firmas")).toBe("Documentos");
    for (const href of CATALOGOS) expect(grupoDe(href), href).toBeUndefined();
  });

  it("la barra inferior solo repite entradas del menú y la Bandeja va una vez", () => {
    const { nav, navInferior } = armar();
    for (const n of navInferior) expect(nav.some((x) => x.href === n.href), n.href).toBe(true);
    expect(navInferior.filter((n) => n.href === "/bandeja")).toHaveLength(1);
  });
  it("cada entrada del menú tiene su propio ícono y ninguno es el de un área de «Más» (CAR-182)", () => {
    const { nav } = armar();
    const iconos = nav.map((n) => n.icono);
    expect(iconos.filter((x, i) => iconos.indexOf(x) !== i)).toEqual([]);
    const esperados: Record<string, string> = {
      "/finanzas": "LayoutDashboard",
      "/finanzas/ventas": "FileText",
      "/finanzas/compras": "ShoppingCart",
      "/finanzas/cobranza": "HandCoins",
      "/remuneraciones": "Banknote",
      "/finanzas/bancos": "Landmark",
      "/finanzas/flujo": "ChartLine",
      "/negocios/seguimiento": "BellRing",
      "/solicitudes": "NotebookPen",
      "/cotizaciones": "ReceiptText",
      "/contactos": "ContactRound",
      "/cuentas": "Building2",
      "/negocios": "Briefcase",
      "/tareas": "ListChecks",
    };
    for (const [href, icono] of Object.entries(esperados))
      expect(nav.find((n) => n.href === href)?.icono, href).toBe(icono);
  });

  it("todos los íconos del menú existen en el catálogo del shell (ninguno cae en el genérico)", () => {
    const generico = icono("__desconocido");
    for (const n of armar().nav) expect(icono(n.icono), `${n.href} (${n.icono})`).not.toBe(generico);
  });
});
