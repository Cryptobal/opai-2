import { beforeAll, describe, expect, it } from "vitest";

import { catalogoNovedades, textoPlanoNovedad, trozosNovedad } from "@opai/domain/novedades";

import { capacidadesDelNucleo } from "../src/core";
import { listarAjustes } from "../src/core/config/catalogo";
import { MANUALES } from "../src/manuales";
import { hallarLenguajeInterno } from "../src/lenguaje-producto";
import { modulos } from "../../../modules/registry/src";
import { registrarModulos, limpiarModulos } from "../src/module";
import { limpiarRegistro, listarCapacidades, registrarCapacidades } from "../src/registry";
import { contextoOwnerAgente } from "./paridad-util";
import { herramientasMcp } from "../src/mcp";

function fallos(texto: string, etiqueta: string): string[] {
  const id = hallarLenguajeInterno(texto);
  return id ? [`${etiqueta}: patrón «${id}»`] : [];
}

beforeAll(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
  limpiarModulos();
  registrarModulos(modulos);
});

describe("lenguaje de producto en textos visibles (CAR-579)", () => {
  it("las ayudas y etiquetas de Configuración no mencionan el proceso interno", () => {
    const errores: string[] = [];
    for (const c of listarAjustes()) {
      const id = `${c.modulo}.${c.clave}`;
      errores.push(...fallos(c.meta.etiqueta, `${id} etiqueta`));
      if (c.meta.ayuda) errores.push(...fallos(c.meta.ayuda, `${id} ayuda`));
    }
    expect(errores).toEqual([]);
  });

  it("las descripciones de capacidades expuestas al agente usan lenguaje de producto", () => {
    const errores: string[] = [];
    const visibles = new Set(herramientasMcp(contextoOwnerAgente()).map((h) => h.capacidad.id));
    for (const c of listarCapacidades()) {
      if (!visibles.has(c.id)) continue;
      errores.push(...fallos(c.descripcion, c.id));
    }
    expect(errores).toEqual([]);
  });

  it("las novedades publicadas no mencionan el proceso interno", () => {
    const errores: string[] = [];
    for (const e of catalogoNovedades()) {
      const texto = textoPlanoNovedad(trozosNovedad(e.descripcion));
      errores.push(...fallos(texto, `novedad:${e.id}`));
      errores.push(...fallos(e.titulo, `novedad:${e.id} título`));
    }
    expect(errores).toEqual([]);
  });

  it("los manuales MCP para agentes no mencionan el proceso interno", () => {
    const errores: string[] = [];
    for (const m of MANUALES) {
      errores.push(...fallos(m.texto, `manual:${m.id}`));
    }
    expect(errores).toEqual([]);
  });
});