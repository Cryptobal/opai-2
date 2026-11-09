import { describe, expect, it } from "vitest";

import {
  CATALOGO_CAMPOS,
  COLECCIONES_CAMPO,
  PERMISOS_CORE,
  VERSION_CATALOGO_CAMPOS,
  campoPorClave,
  camposPara,
  clasificarCampos,
  parsearPlantillaCampos,
} from "@opai/domain";

import { generarPromptPropuesta } from "./prompt-exportable";

const todos = clasificarCampos("propuesta", () => true);
const prompt = () =>
  generarPromptPropuesta({
    disponibles: todos.autorizados,
    sinValores: todos.sinResolvedor,
    colecciones: COLECCIONES_CAMPO,
  });

/** Todo `{{…}}` del texto, sin las llaves de ejemplos de sintaxis genéricos (`clave`, `…`). */
const marcadores = (t: string) =>
  [...t.matchAll(/\{\{\s*(?:#cada|#si)?\s*([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)+)/g)].map((m) => m[1] ?? "");

describe("prompt exportable de la propuesta", () => {
  it("lleva la versión del catálogo y todas las claves, alias, tipos y ejemplos disponibles", () => {
    const p = prompt();
    expect(p.version).toBe(VERSION_CATALOGO_CAMPOS);
    expect(p.texto).toContain(`v${VERSION_CATALOGO_CAMPOS}`);
    for (const c of todos.autorizados) {
      expect(p.texto).toContain(`{{${c.clave}}}`);
      expect(p.texto).toContain(c.ejemplo);
      for (const a of c.alias ?? []) expect(p.texto).toContain(`{{${a}}}`);
    }
    expect(p.claves).toEqual(todos.autorizados.map((c) => c.clave));
  });

  it("no escribe ninguna clave que no esté en el catálogo ni en la finalidad propuesta", () => {
    const permitidas = new Set(camposPara("propuesta").map((c) => c.clave));
    for (const k of marcadores(prompt().texto)) {
      expect(campoPorClave(k), k).toBeDefined();
      expect(permitidas.has(campoPorClave(k)?.clave ?? ""), k).toBe(true);
    }
  });

  it("no incluye campos de otras finalidades ni los sin valores como usables", () => {
    const p = prompt();
    const soloContrato = CATALOGO_CAMPOS.filter((c) => !c.finalidades.includes("propuesta"));
    expect(soloContrato.length).toBeGreaterThan(0);
    for (const c of soloContrato) expect(p.texto).not.toContain(c.clave);
    for (const c of todos.sinResolvedor) expect(p.claves.includes(c.clave)).toBe(false);
  });

  it("respeta el permiso: sin lectura de maestros no aparecen sus campos", () => {
    const sin = clasificarCampos("propuesta", () => false);
    const p = generarPromptPropuesta({ disponibles: sin.autorizados, colecciones: COLECCIONES_CAMPO });
    expect(p.claves).toEqual([]);
    expect(p.texto).not.toContain("{{cuenta.nombre}}");
    expect(p.texto).not.toContain("Ejemplo de repetición");
  });

  it("con permiso parcial no explica la repetición de una entidad sin marcadores", () => {
    const sinInstalaciones = clasificarCampos("propuesta", (p) => p !== PERMISOS_CORE.instalacionesRead);
    const p = generarPromptPropuesta({ disponibles: sinInstalaciones.autorizados, colecciones: COLECCIONES_CAMPO });
    expect(p.claves.some((k) => k.startsWith("instalacion."))).toBe(false);
    expect(p.claves).toContain("cuenta.nombre");
    expect(p.texto).not.toContain("#cada instalaciones");
    expect(p.texto).not.toContain("instalacion.");
  });

  it("explica la repetición y la condición con la sintaxis real y un ejemplo que valida", () => {
    const { texto } = prompt();
    expect(texto).toContain("{{#cada instalaciones}}");
    expect(texto).toContain("{{#si clave}}");
    expect(texto).toContain("No se anida un `#cada`");
    const ej = texto.split("```")[1] ?? "";
    expect(parsearPlantillaCampos(ej).problemas).toEqual([]);
    expect(texto).toContain("Planta Ficticia Norte");
  });

  it("no promete otros formatos ni importación", () => {
    const t = prompt().texto.toLowerCase();
    for (const x of ["figma", "pptx", "powerpoint", "google cloud", "importa el html"]) expect(t).not.toContain(x);
    expect(t).toContain("no genera por sí solo archivos");
    expect(t).toContain("no tienen marcador todavía");
  });
});
