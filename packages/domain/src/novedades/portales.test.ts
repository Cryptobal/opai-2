import { describe, expect, it } from "vitest";

import { novedadesVisibles, type EntradaNovedad } from "./catalogo";
import { portalesDeEntrada, visibleEnPortal } from "./portales";

const base = (extra: Partial<EntradaNovedad> = {}): EntradaNovedad => ({
  id: "x",
  fecha: "2026-11-14",
  modulo: "core",
  titulo: "t",
  descripcion: "d",
  ruta: null,
  destacada: false,
  car: null,
  permiso: null,
  imagen: null,
  portales: ["erp"],
  ...extra,
});

describe("visibleEnPortal (CAR-542)", () => {
  it("el ERP ve entradas de cualquier audiencia declarada", () => {
    expect(visibleEnPortal(["terreno"], "erp")).toBe(true);
    expect(visibleEnPortal(undefined, "erp")).toBe(true);
  });

  it("Terreno solo ve las suyas", () => {
    expect(visibleEnPortal(["erp"], "terreno")).toBe(false);
    expect(visibleEnPortal(["terreno", "erp"], "terreno")).toBe(true);
  });

  it("sin portales en frontmatter equivale a solo ERP", () => {
    expect(portalesDeEntrada(undefined)).toEqual(["erp"]);
    expect(visibleEnPortal(undefined, "terreno")).toBe(false);
  });
});

describe("novedadesVisibles y portal", () => {
  const items = [
    base({ id: "erp", portales: ["erp"] }),
    base({ id: "terreno", portales: ["terreno"] }),
    base({ id: "ambos", portales: ["erp", "terreno"] }),
  ];

  it("filtra por portal sin tocar el recorte por módulo", () => {
    const terreno = novedadesVisibles(items, ["core"], () => true, false, [], "terreno").map(
      (e) => e.id,
    );
    expect(terreno).toEqual(["terreno", "ambos"]);
    const erp = novedadesVisibles(items, ["core"], () => true, false, [], "erp").map((e) => e.id);
    expect(erp).toEqual(["erp", "terreno", "ambos"]);
  });
});