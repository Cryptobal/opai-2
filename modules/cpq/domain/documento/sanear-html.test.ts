import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { VERSION_CATALOGO_CAMPOS } from "@opai/domain";

import { sanearHtml } from "./sanear-html";

/** HTML sintético de prueba (no es un diseño): solo ejercita el saneador con marcadores reales del catálogo. */
const VALIDO = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>x</title></head><body>
<section class="card" style="padding: 16px; color: var(--ds-fg)"><h1>Propuesta para {{cuenta.nombre}}</h1>
{{#cada instalaciones}}<div><b>{{instalacion.nombre}}</b>{{#si instalacion.direccion}} · {{instalacion.direccion}}{{/si}}</div>{{/cada}}
<a href="https://ejemplo.cl/info">Más</a></section></body></html>`;

const codigos = (h: string) => sanearHtml(h).problemas.map((p) => p.codigo);

describe("saneador de HTML de propuesta", () => {
  it("acepta HTML con marcadores del catálogo y devuelve solo el cuerpo", () => {
    const r = sanearHtml(VALIDO);
    expect(r.ok).toBe(true);
    expect(r.html.startsWith("<section")).toBe(true);
    expect(r.html).not.toContain("<title");
    expect(r.html).toContain("{{#cada instalaciones}}");
    expect(r.html).toContain('rel="noopener noreferrer"');
    expect(r.tokens.usados).toEqual(expect.arrayContaining(["cuenta.nombre", "instalacion.nombre", "instalacion.direccion"]));
    expect(r.tokens.colecciones).toEqual(["instalaciones"]);
    expect(r.catalogoVersion).toBe(VERSION_CATALOGO_CAMPOS);
  });

  it.each([
    ["<p>hola</p><script>alert(1)</script>", "elemento_activo"],
    ["<p>hola</p><iframe src='https://x.cl'></iframe>", "elemento_activo"],
    ["<p>hola</p><form><input></form>", "elemento_activo"],
    ["<svg><circle/></svg><p>hola</p>", "elemento_activo"],
    ["<link rel='stylesheet' href='https://x.cl/a.css'><p>hola</p>", "recurso_externo"],
    ["<style>@import url(https://x.cl/a.css)</style><p>hola</p>", "recurso_externo"],
    ["<img src='https://x.cl/a.png'><p>hola</p>", "recurso_externo"],
    ["<p onclick='x()'>hola</p>", "manejador_evento"],
    ["<p>hola</p><a href='javascript:alert(1)'>x</a>", "url_no_permitida"],
    ["<a href='http://x.cl'>x</a>", "url_no_permitida"],
    ["<a href='data:text/html,<b>x</b>'>x</a>", "url_no_permitida"],
    ["<p style='background: url(https://x.cl/a.png)'>hola</p>", "estilo_no_permitido"],
    ["<p style='width: expression(alert(1))'>hola</p>", "estilo_no_permitido"],
    ["<p>hola</p><x-dc>algo</x-dc>", "elemento_no_permitido"],
    ["<a href='{{instalacion.mapa_url}}'>x</a>", "token_en_atributo"],
    ["<p>{{cuenta.inventado}}</p>", "token"],
    ["<p>{{#cada instalaciones}} sin cerrar</p>", "token"],
    ["   ", "vacio"],
  ])("rechaza %s", (html, codigo) => {
    const r = sanearHtml(html);
    expect(r.ok).toBe(false);
    expect(r.html).toBe("");
    expect(codigos(html)).toContain(codigo);
  });

  it("quita sin rechazar los atributos y estilos no permitidos y lo informa", () => {
    const r = sanearHtml('<div id="a" data-x="1" class="k" style="position: fixed; color: red">{{cuenta.nombre}}</div>');
    expect(r.ok).toBe(true);
    expect(r.html).toBe('<div class="k" style="color: red">{{cuenta.nombre}}</div>');
    expect(r.advertencias.map((a) => a.detalle)).toEqual(expect.arrayContaining(["div.id", "div.data-x", "position"]));
  });

  it("no deja pasar HTML mal formado que intente escapar de una etiqueta", () => {
    const r = sanearHtml('<p title=\'"><script>alert(1)</script>\'>{{cuenta.nombre}}</p>');
    expect(r.ok).toBe(true);
    expect(r.html).not.toContain("<script");
    expect(r.html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("rechaza lo que excede los límites", () => {
    expect(codigos("<p>x</p>".repeat(60_000))).toContain("limite");
    expect(codigos("<div>".repeat(60) + "x" + "</div>".repeat(60))).toContain("limite");
  });

  it("el export real de Claude Design (PropuestaCliente.dc.html) NO se puede importar tal cual", () => {
    const real = readFileSync(new URL("../../../../docs/2.0/diseño/export-cpq/PropuestaCliente.dc.html", import.meta.url), "utf8");
    const r = sanearHtml(real);
    expect(r.ok).toBe(false);
    expect(r.html).toBe("");
    const c = new Set(r.problemas.map((p) => p.codigo));
    // Trae scripts, hojas de estilo remotas, elementos propios (x-dc, sc-if, x-import) y enlaces de datos {{ … }} del
    // entorno de Claude Design que no son campos del catálogo.
    for (const esperado of ["elemento_activo", "recurso_externo", "elemento_no_permitido", "token_en_atributo"]) expect(c.has(esperado as never)).toBe(true);
  });
});
