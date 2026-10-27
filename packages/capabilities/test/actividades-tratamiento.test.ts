// La capa de negocio del RAT (actividades) cubre TODO el inventario técnico y no filtra nombres de
// columna. Gate del hallazgo C10/C11 de la QA (Parte C): si alguien agrega una tabla al inventario
// sin actividad, o un campo sin etiqueta legible, este test falla.
import { describe, expect, it } from "vitest";

import {
  ACTIVIDADES_TRATAMIENTO,
  CATEGORIA_RAT_DE,
  conteosPorCategoria,
  construirRatPorActividad,
  ETIQUETA_BASE_LICITUD,
  ETIQUETA_CAMPO,
} from "@opai/domain";

import { listarInventario } from "../src/core/cumplimiento/inventario";

describe("actividades de tratamiento (RAT) · capa de negocio sobre el inventario", () => {
  const inventario = listarInventario();
  const cubiertas = new Set(ACTIVIDADES_TRATAMIENTO.flatMap((a) => a.tablas));

  it("cada tabla del inventario queda cubierta por al menos una actividad", () => {
    const sinCubrir = inventario.map((d) => d.tabla).filter((t) => !cubiertas.has(t));
    expect(sinCubrir).toEqual([]);
  });

  it("cada actividad solo referencia tablas que existen en el inventario", () => {
    const tablas = new Set(inventario.map((d) => d.tabla));
    const fantasma = [...cubiertas].filter((t) => !tablas.has(t));
    expect(fantasma).toEqual([]);
  });

  it("toda columna del inventario tiene etiqueta legible (ningún nombre técnico filtra a la UI)", () => {
    const sinEtiqueta = inventario
      .flatMap((d) => d.campos)
      .filter((c) => !(c in ETIQUETA_CAMPO));
    expect(sinEtiqueta).toEqual([]);
  });

  it("toda base de licitud usada por una actividad tiene etiqueta legible", () => {
    const sinBase = ACTIVIDADES_TRATAMIENTO.filter((a) => !(a.baseLicitud in ETIQUETA_BASE_LICITUD));
    expect(sinBase).toEqual([]);
  });

  it("la categoría principal de cada actividad está entre sus categorías derivadas del inventario", () => {
    const filas = construirRatPorActividad(inventario);
    for (const f of filas) expect(f.categorias).toContain(f.categoria);
    expect(filas.length).toBe(ACTIVIDADES_TRATAMIENTO.length);
  });

  it("los datos de cada actividad son etiquetas legibles (sin nombres técnicos) y no están vacíos", () => {
    const filas = construirRatPorActividad(inventario);
    // Columnas técnicas evidentes (con guion bajo): jamás deben aparecer tal cual en los datos.
    const tecnicas = new Set(inventario.flatMap((d) => d.campos).filter((c) => c.includes("_")));
    for (const f of filas) {
      expect(f.datos.length).toBeGreaterThan(0);
      expect(f.datos.filter((d) => tecnicas.has(d) || d.includes("_"))).toEqual([]);
    }
  });

  it("el mapa de categorías técnico→negocio cubre todas las categorías del inventario", () => {
    const sinMapa = inventario
      .flatMap((d) => d.categorias)
      .filter((c) => !(c in CATEGORIA_RAT_DE));
    expect(sinMapa).toEqual([]);
  });

  it("los conteos cubren las 5 categorías de negocio", () => {
    const filas = construirRatPorActividad(inventario);
    expect(conteosPorCategoria(filas).length).toBe(5);
  });
});
