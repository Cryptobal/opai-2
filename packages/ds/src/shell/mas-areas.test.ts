import { Briefcase, Building2, Users } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  areasAbiertasIniciales,
  esAreaSuelta,
  estructuraMas,
  guardarAreasAbiertas,
  leerAreasAbiertas,
} from "./mas-areas";
import type { NavItem } from "./types";

const item = (href: string, etiqueta: string, grupo?: string, extra: Partial<NavItem> = {}): NavItem => ({
  href,
  etiqueta,
  icono: Building2,
  ...(grupo ? { grupo, area: grupo.toLowerCase() } : {}),
  ...extra,
});
const items = [
  item("/negocios", "Negocios", "Comercial"),
  item("/cuentas", "Cuentas", "Comercial"),
  item("/instalaciones", "Instalaciones", "Operaciones"),
  item("/tickets", "Tickets", "Operaciones"),
  item("/remuneraciones", "Remuneraciones", "Personas"),
  item("/configuracion", "Configuración", undefined, { pie: true, icono: Users }),
];

describe("estructuraMas", () => {
  it("agrupa por área en su orden y deja Configuración al pie", () => {
    const e = estructuraMas(items, "/tickets");
    expect(e.areas.map((a) => a.nombre)).toEqual(["Comercial", "Operaciones", "Personas"]);
    expect(e.pie.map((i) => i.etiqueta)).toEqual(["Configuración"]);
    expect(e.sueltas).toEqual([]);
  });
  it("marca activa solo el área de la página actual", () => {
    const e = estructuraMas(items, "/tickets/abc");
    expect(e.areas.filter((a) => a.activa).map((a) => a.id)).toEqual(["operaciones"]);
  });
  it("las entradas sin área quedan sueltas arriba", () => {
    const e = estructuraMas([item("/bandeja", "Bandeja"), ...items], "/");
    expect(e.sueltas.map((i) => i.href)).toEqual(["/bandeja"]);
  });
  it("un área de una entrada es suelta (no se pliega) y cada área trae un ícono propio", () => {
    const e = estructuraMas(items, "/");
    expect(e.areas.map(esAreaSuelta)).toEqual([false, false, true]);
    const iconos = e.areas.map((a) => a.icono);
    expect(new Set(iconos).size).toBe(iconos.length);
    expect(iconos).not.toContain(Briefcase);
  });
});

describe("áreas abiertas", () => {
  const { areas } = estructuraMas(items, "/tickets");
  it("por defecto abre solo el área de la página actual", () => {
    expect([...areasAbiertasIniciales(areas, null)]).toEqual(["operaciones"]);
  });
  it("suma lo que la persona dejó abierto y siempre el área actual; ignora áreas que ya no existen", () => {
    expect([...areasAbiertasIniciales(areas, ["comercial", "finanzas"])].sort()).toEqual([
      "comercial",
      "operaciones",
    ]);
  });
  it("sin ninguna activa (Configuración) no abre ninguna", () => {
    const { areas: sinActiva } = estructuraMas(items, "/configuracion");
    expect(areasAbiertasIniciales(sinActiva, null).size).toBe(0);
  });
});

describe("estado recordado por usuario y empresa", () => {
  afterEach(() => vi.unstubAllGlobals());
  const almacen = () => {
    const datos = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
    });
    return datos;
  };
  it("guarda y lee por época (usuario + empresa)", () => {
    almacen();
    guardarAreasAbiertas("u1:t1", new Set(["comercial"]));
    guardarAreasAbiertas("u1:t2", new Set(["finanzas"]));
    expect(leerAreasAbiertas("u1:t1")).toEqual(["comercial"]);
    expect(leerAreasAbiertas("u1:t2")).toEqual(["finanzas"]);
    expect(leerAreasAbiertas("u2:t1")).toBeNull();
  });
  it("sin época o con almacenamiento roto no falla", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "{no es json",
      setItem: () => {
        throw new Error("bloqueado");
      },
    });
    expect(leerAreasAbiertas(undefined)).toBeNull();
    expect(leerAreasAbiertas("x")).toBeNull();
    expect(() => guardarAreasAbiertas("x", new Set(["a"]))).not.toThrow();
  });
});
