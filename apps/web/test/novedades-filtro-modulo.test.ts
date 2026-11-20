import { describe, expect, it } from "vitest";

import { listaMarcarIds } from "@/app/_components/novedades/aplicar-leida";
import {
  contarNoLeidas,
  filtrarItems,
  idsNoLeidasFiltradas,
  MODULO_TODOS,
  modulosConNovedades,
} from "@/app/_components/novedades/filtro-novedades";
import type { ItemNovedad } from "@/app/_components/novedades/tarjeta-novedad";

const base = (): ItemNovedad => ({
  id: "x",
  fecha: "2026-11-16",
  moduloEtiqueta: "Núcleo",
  titulo: "t",
  descripcion: "d",
  ruta: "/finanzas",
  imagen: null,
  destacada: false,
  car: null,
  pr: null,
  leida: false,
});

describe("filtro por módulo", () => {
  const fin = { ...base(), id: "fin", ruta: "/finanzas" };
  const per = { ...base(), id: "per", ruta: "/personas", leida: true };
  const gen = { ...base(), id: "gen", ruta: null, moduloEtiqueta: "Núcleo" };

  it("lista solo módulos presentes", () => {
    expect(modulosConNovedades([fin, per, gen])).toEqual(["Finanzas", "General", "Personas"]);
  });

  it("combina módulo con No leídas", () => {
    const items = [fin, per, gen];
    expect(contarNoLeidas(items, "Finanzas")).toBe(1);
    expect(
      filtrarItems({ items, filtro: "no_leidas", modulo: "Finanzas", leidasAqui: new Set() }),
    ).toHaveLength(1);
  });

  it("expone ids para marcar solo el filtro", () => {
    expect(idsNoLeidasFiltradas([fin, gen], "General")).toEqual(["gen"]);
  });

  it("marca parcial sin tocar otras", () => {
    const datos = {
      items: [fin, gen],
      noLeidas: 2,
      destacadaPendiente: null,
    };
    const r = listaMarcarIds(datos, ["gen"]);
    expect(r.items.find((i) => i.id === "gen")?.leida).toBe(true);
    expect(r.items.find((i) => i.id === "fin")?.leida).toBe(false);
    expect(r.noLeidas).toBe(1);
  });
});

describe("MODULO_TODOS", () => {
  it("cuenta todas las pendientes", () => {
    const items = [{ ...base(), id: "a" }, { ...base(), id: "b", leida: true }];
    expect(contarNoLeidas(items, MODULO_TODOS)).toBe(1);
  });
});