import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { catalogoNovedades, textoPlanoNovedad, trozosNovedad } from "@opai/domain/novedades";
import { COMUNICABLES_NUCLEO } from "@opai/domain";
import { INTEGRACIONES_EXTRA } from "../../integrations/src/catalogo-extra";

import { capacidadesDelNucleo } from "../src/core";
import { listarAjustes } from "../src/core/config/catalogo";
import { MANUALES } from "../src/manuales";
import { escanearDirectorio, ignorarCadenaVisible } from "../src/lenguaje-producto-escaneo";
import { hallarLenguajeInterno } from "../src/lenguaje-producto";
import { modulos } from "../../../modules/registry/src";
import { registrarModulos, limpiarModulos } from "../src/module";
import { limpiarRegistro, listarCapacidades, registrarCapacidades } from "../src/registry";
import { contextoOwnerAgente } from "./paridad-util";
import { herramientasMcp } from "../src/mcp";

const RAIZ = join(import.meta.dirname, "../../..");

function fallos(texto: string, etiqueta: string): string[] {
  const id = hallarLenguajeInterno(texto);
  return id ? [`${etiqueta}: patrón «${id}»`] : [];
}

function recorrerDescribe(
  subruta: string,
  omitir: (rel: string) => boolean,
  porLiteral: (rel: string, literal: string) => void,
): void {
  const base = join(RAIZ, subruta);
  function walk(dir: string) {
    for (const nombre of readdirSync(dir)) {
      const abs = join(dir, nombre);
      const rel = `${subruta}/${abs.slice(base.length + 1)}`.replace(/\\/g, "/");
      if (omitir(rel) || rel.includes("/node_modules/")) continue;
      const st = statSync(abs);
      if (st.isDirectory()) walk(abs);
      else if (nombre.endsWith(".ts")) {
        const fuente = readFileSync(abs, "utf8");
        for (const m of fuente.matchAll(/\.describe\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
          porLiteral(rel, m[2] ?? "");
        }
      }
    }
  }
  walk(base);
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

  it("los textos visibles de apps/web no mencionan el proceso interno", () => {
    const omitir = (rel: string) =>
      rel.includes("apps/web/app/ds/") ||
      rel.includes("apps/web/e2e/") ||
      rel.includes("apps/web/test/") ||
      rel.startsWith("apps/web/app/api/");
    const errores = escanearDirectorio("apps/web", [".tsx", ".ts"], omitir);
    expect(errores).toEqual([]);
  });

  it("las plantillas y ejemplos de comunicaciones no mencionan el proceso interno", () => {
    const errores: string[] = [];
    for (const e of COMUNICABLES_NUCLEO) {
      errores.push(...fallos(e.nombre, `comunicacion:${e.evento} nombre`));
      errores.push(...fallos(e.descripcion, `comunicacion:${e.evento} descripcion`));
      for (const v of e.variables) {
        if (!ignorarCadenaVisible(v.ejemplo)) errores.push(...fallos(v.ejemplo, `comunicacion:${e.evento} ${v.ruta}`));
        errores.push(...fallos(v.descripcion, `comunicacion:${e.evento} ${v.ruta} ayuda`));
      }
      for (const p of Object.values(e.plantillas)) {
        if (!p) continue;
        errores.push(...fallos(p.asunto, `comunicacion:${e.evento} asunto`));
        errores.push(...fallos(p.cuerpo, `comunicacion:${e.evento} cuerpo`));
      }
    }
    expect(errores).toEqual([]);
  });

  it("las etiquetas visibles de integraciones no mencionan el proceso interno", () => {
    const errores: string[] = [];
    for (const i of INTEGRACIONES_EXTRA) {
      errores.push(...fallos(i.nombre, `integracion:${i.id} nombre`));
      for (const s of i.secretos) errores.push(...fallos(s.etiqueta, `integracion:${i.id} ${s.nombre}`));
    }
    expect(errores).toEqual([]);
  });

  it("los esquemas MCP (describe) en capacidades y módulos usan lenguaje de producto", () => {
    const omitir = (rel: string) => rel.includes(".test.") || rel.includes("/test/");
    const errores: string[] = [];
    for (const sub of ["packages/capabilities/src", "modules"]) {
      recorrerDescribe(sub, omitir, (rel, lit) => {
        if (ignorarCadenaVisible(lit)) return;
        const id = hallarLenguajeInterno(lit);
        if (id) errores.push(`${rel}: patrón «${id}» en describe «${lit.slice(0, 80)}${lit.length > 80 ? "…" : ""}»`);
      });
    }
    expect(errores).toEqual([]);
  });

  it("los manifiestos no publican textos con lenguaje interno", () => {
    const omitir = (rel: string) => !rel.endsWith("/manifest.ts") || rel.includes(".test.");
    const errores = escanearDirectorio("modules", [".ts"], omitir);
    expect(errores).toEqual([]);
  });

  it("mensajes visibles en capacidades, módulos e integraciones no mencionan el proceso interno", () => {
    const omitir = (rel: string) =>
      rel.includes(".test.") ||
      rel.includes("/test/") ||
      rel.endsWith("lenguaje-producto.ts") ||
      rel.endsWith("define.ts") ||
      rel.includes("/cumplimiento/inventario-") ||
      rel.endsWith("pdf-fixtures.ts");
    const errores = [
      ...escanearDirectorio("packages/capabilities/src", [".ts"], omitir),
      ...escanearDirectorio("modules", [".ts"], omitir),
      ...escanearDirectorio("packages/integrations/src", [".ts"], omitir),
    ];
    expect(errores).toEqual([]);
  });
});