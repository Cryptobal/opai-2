import { describe, expect, it } from "vitest";

import {
  armarNavegacion,
  entradaInicio,
  entradasAreaPrincipal,
  type EntradaArea,
} from "@/lib/navegacion-areas";

const INICIO: EntradaArea = {
  area: "inicio",
  href: "/",
  etiqueta: "Inicio",
  icono: "Home",
  modulo: "core",
};
const CUENTAS: EntradaArea = {
  area: "clientes",
  href: "/cuentas",
  etiqueta: "Cuentas",
  icono: "Building2",
  modulo: "core",
  permiso: "core:cuentas.read",
  orden: 1,
};
const INSTALACIONES: EntradaArea = {
  area: "clientes",
  href: "/instalaciones",
  etiqueta: "Instalaciones",
  icono: "MapPin",
  modulo: "core",
  permiso: "core:instalaciones.read",
  orden: 2,
};
const PERSONAS: EntradaArea = {
  area: "personas",
  href: "/personas",
  etiqueta: "Personas",
  icono: "Users",
  modulo: "core",
  permiso: "core:personas.read",
  orden: 1,
};
const CARGOS: EntradaArea = {
  area: "personas",
  href: "/cargos",
  etiqueta: "Cargos y sueldos",
  icono: "Briefcase",
  modulo: "core",
  permiso: "core:estructuras.read",
  orden: 2,
};
const PUESTOS: EntradaArea = {
  area: "operaciones",
  href: "/puestos",
  etiqueta: "Puestos",
  icono: "MapPin",
  modulo: "ops",
  permiso: "ops:read",
  orden: 1,
};
const NOMINA: EntradaArea = {
  area: "personas",
  href: "/nomina",
  etiqueta: "Nómina",
  icono: "Gauge",
  modulo: "nomina",
  permiso: "nomina:read",
  orden: 3,
};
const DOCUMENTOS: EntradaArea = {
  area: "documentos",
  href: "/documentos",
  etiqueta: "Documentos",
  icono: "FileText",
  modulo: "documentos",
  permiso: "documentos:read",
  orden: 1,
};

const todas = () => true;

describe("armarNavegacion", () => {
  it("escenario A (solo núcleo): Inicio, Clientes y Personas, sin Operaciones ni Documentos", () => {
    const grupos = armarNavegacion([INICIO, CUENTAS, INSTALACIONES, PERSONAS, CARGOS], {
      puede: todas,
      modulosActivos: [],
    });
    expect(grupos.map((g) => g.area)).toEqual(["inicio", "clientes", "personas"]);
  });

  it("respeta el orden cerrado de R1 sin importar el orden de los items", () => {
    const grupos = armarNavegacion([DOCUMENTOS, PERSONAS, CUENTAS, INICIO], {
      puede: todas,
      modulosActivos: ["documentos"],
    });
    expect(grupos.map((g) => g.area)).toEqual(["inicio", "clientes", "personas", "documentos"]);
  });

  it("ordena las entradas de un área por 'orden'", () => {
    const grupos = armarNavegacion([INSTALACIONES, CUENTAS], { puede: todas, modulosActivos: [] });
    expect(grupos[0]?.entradas.map((e) => e.href)).toEqual(["/cuentas", "/instalaciones"]);
  });

  it("R3: un área con una sola entrada visible queda suelta", () => {
    const grupos = armarNavegacion([INICIO, CUENTAS], { puede: todas, modulosActivos: [] });
    const clientes = grupos.find((g) => g.area === "clientes");
    expect(clientes?.suelta).toBe(true);
    const inicio = grupos.find((g) => g.area === "inicio");
    expect(inicio?.suelta).toBe(true);
  });

  it("escenario D (Puestos + Nómina, nota de ADR-048): Operaciones y Personas, sin Comercial ni Finanzas", () => {
    const grupos = armarNavegacion([INICIO, PERSONAS, PUESTOS, NOMINA], {
      puede: todas,
      modulosActivos: ["ops", "nomina"],
    });
    expect(grupos.map((g) => g.area)).toEqual(["inicio", "operaciones", "personas"]);
  });

  it("filtra por módulo activo: sin el módulo, su entrada no aparece aunque haya permiso", () => {
    const grupos = armarNavegacion([INICIO, PUESTOS], { puede: todas, modulosActivos: [] });
    expect(grupos.map((g) => g.area)).toEqual(["inicio"]);
  });

  it("filtra por permiso: sin el permiso, la entrada no aparece aunque el módulo esté activo", () => {
    const grupos = armarNavegacion([INICIO, PUESTOS], {
      puede: () => false,
      modulosActivos: ["ops"],
    });
    expect(grupos.map((g) => g.area)).toEqual(["inicio"]);
  });

  it("viewer: sin Nómina (D10, ya es regla de ADR-016)", () => {
    const puedeViewer = (p: string) => p.endsWith(".read") && p !== "nomina:read";
    const grupos = armarNavegacion([INICIO, PERSONAS, NOMINA], {
      puede: puedeViewer,
      modulosActivos: ["nomina"],
    });
    const personas = grupos.find((g) => g.area === "personas");
    expect(personas?.entradas.map((e) => e.href)).toEqual(["/personas"]);
  });

  it("gerente y supervisor: sin Finanzas (CA5), via el permiso que el llamador resuelve", () => {
    const FINANZAS: EntradaArea = {
      area: "finanzas",
      href: "/flujo-caja",
      etiqueta: "Flujo de caja",
      icono: "Gauge",
      modulo: "finanzas",
      permiso: "finanzas:read",
    };
    const sinFinanzas = (p: string) => !p.startsWith("finanzas:");
    const grupos = armarNavegacion([INICIO, FINANZAS], {
      puede: sinFinanzas,
      modulosActivos: ["finanzas"],
    });
    expect(grupos.map((g) => g.area)).toEqual(["inicio"]);
  });

  it("D2: un área con más de 7 entradas declaradas falla en desarrollo (NODE_ENV=test)", () => {
    const ocho = Array.from({ length: 8 }, (_, i) => ({
      area: "finanzas" as const,
      href: `/f${i}`,
      etiqueta: `F${i}`,
      icono: "Gauge",
      modulo: "core",
    }));
    expect(() => armarNavegacion(ocho, { puede: todas, modulosActivos: [] })).toThrow(/D2/);
  });

  it("siete entradas en un área no falla (D2: hoy Finanzas tiene justo siete)", () => {
    const siete = Array.from({ length: 7 }, (_, i) => ({
      area: "finanzas" as const,
      href: `/f${i}`,
      etiqueta: `F${i}`,
      icono: "Gauge",
      modulo: "core",
    }));
    expect(() => armarNavegacion(siete, { puede: todas, modulosActivos: [] })).not.toThrow();
  });
});

describe("entradaInicio", () => {
  it("devuelve la entrada de Inicio del grupo suelto", () => {
    const grupos = armarNavegacion([INICIO, CUENTAS], { puede: todas, modulosActivos: [] });
    expect(entradaInicio(grupos)?.href).toBe("/");
  });
});

describe("entradasAreaPrincipal", () => {
  const grupos = armarNavegacion([INICIO, CUENTAS, INSTALACIONES, PERSONAS, CARGOS], {
    puede: todas,
    modulosActivos: [],
  });

  it("usa el área principal elegida", () => {
    expect(entradasAreaPrincipal(grupos, "personas").map((e) => e.href)).toEqual([
      "/personas",
      "/cargos",
    ]);
  });

  it("sin el área principal disponible, usa el respaldo del escenario A (§10)", () => {
    expect(entradasAreaPrincipal(grupos, "comercial").map((e) => e.href)).toEqual([
      "/cuentas",
      "/personas",
    ]);
  });

  it("recorta a tres entradas como máximo", () => {
    const CONTACTOS: EntradaArea = { ...INSTALACIONES, href: "/contactos", orden: 3 };
    const PUESTOS2: EntradaArea = { ...INSTALACIONES, href: "/x", area: "clientes", orden: 4 };
    const g = armarNavegacion([INICIO, CUENTAS, INSTALACIONES, CONTACTOS, PUESTOS2], {
      puede: todas,
      modulosActivos: [],
    });
    expect(entradasAreaPrincipal(g, "clientes")).toHaveLength(3);
  });
});
