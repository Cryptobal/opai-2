import { describe, expect, it } from "vitest";

import { sanearHtml } from "./sanear-html";
import { htmlBasePropuesta } from "./html-base-propuesta";
import { conSecciones, htmlSecciones, type DatosSecciones } from "./html-secciones";
import type { BloqueArmadorPropuesta } from "./propuesta-tecnica";

const bloque = (tipo: BloqueArmadorPropuesta["tipo"], extra: Partial<BloqueArmadorPropuesta> = {}): BloqueArmadorPropuesta => ({
  id: `${tipo}-${extra.titulo ?? ""}`,
  tipo,
  activo: true,
  fijo: false,
  opcional: true,
  ...extra,
});

const datos = (bloques: BloqueArmadorPropuesta[], extra: Partial<DatosSecciones> = {}): DatosSecciones => ({
  bloques,
  textosBiblioteca: { metodologia: "Texto tipo de metodología." },
  servicio: { codigo: "COT-1", versionNumero: 1, secciones: [] },
  capitulos: [],
  resumen: { apertura: "por_instalacion", secciones: [], netoTotalClp: 1_000_000 },
  ejecutivo: null,
  empresa: "Empresa Ficticia SpA",
  condiciones: "",
  borrador: false,
  ...extra,
});

describe("htmlSecciones", () => {
  it("pone título y texto de cada sección activa, en orden: primero el texto propio, luego el tipo", () => {
    const html = htmlSecciones(
      datos([
        bloque("comprension_servicio", { contenidoOverride: "Entendemos <b>el servicio</b>.\nSegunda línea." }),
        bloque("metodologia", { bibliotecaClave: "metodologia" }),
        bloque("texto_libre", { titulo: "Anexo propio", contenidoOverride: "Texto del anexo" }),
      ]),
    );
    expect(html.indexOf("1. Comprensión del servicio")).toBeLessThan(html.indexOf("2. Metodología de trabajo"));
    expect(html.indexOf("2. Metodología de trabajo")).toBeLessThan(html.indexOf("3. Anexo propio"));
    expect(html).toContain("<p>Entendemos &lt;b&gt;el servicio&lt;/b&gt;.</p><p>Segunda línea.</p>");
    expect(html).toContain("Texto tipo de metodología.");
    expect(sanearHtml(html).ok).toBe(true);
  });

  it("omite las secciones inactivas, las estructurales y las activas sin texto", () => {
    const html = htmlSecciones(
      datos([
        bloque("portada"),
        bloque("salto_pagina"),
        bloque("metodologia", { activo: false, contenidoOverride: "No sale" }),
        bloque("certificaciones"),
        bloque("contacto_ejecutivo"),
        bloque("texto_libre", { contenidoOverride: "Sí sale" }),
      ]),
    );
    expect(html).not.toMatch(/No sale|Certificaciones|ejecutivo/i);
    expect(html).toContain("<h2>1. Información adicional</h2>");
  });

  it("arma el índice con las secciones que sí salen y numera los capítulos por instalación", () => {
    const capitulo = { instalacionId: "i1", nombre: "Planta Norte", direccion: "Calle 1", mapaUrl: null, puestos: [], totales: { guardiasSimultaneos: 0, dotacion: null }, secciones: [{ clave: "contexto", titulo: "Contexto", texto: "Detalle" }], faltantes: [] };
    const html = htmlSecciones(
      datos([bloque("indice"), bloque("certificaciones"), bloque("detalle_servicio"), bloque("resumen_economico")], {
        capitulos: [capitulo as unknown as DatosSecciones["capitulos"][number]],
      }),
    );
    expect(html).toContain("<li>1. Detalle del servicio</li><li>1.1. Planta Norte</li><li>2. Resumen económico</li>");
    expect(html).toContain("<h3>1.1. Planta Norte</h3>");
    expect(html).toContain("<h4>Contexto</h4><p>Detalle</p>");
  });

  it("las condiciones caen a las de la cotización y el contacto muestra al ejecutivo", () => {
    const html = htmlSecciones(
      datos([bloque("condiciones"), bloque("contacto_ejecutivo")], { condiciones: "Pago a 30 días", ejecutivo: "Ejecutiva Ficticia" }),
    );
    expect(html).toContain("<p>Pago a 30 días</p>");
    expect(html).toContain("<p>Ejecutiva Ficticia</p><p>Empresa Ficticia SpA</p>");
  });

  it("el resumen económico trae neto, IVA y total", () => {
    const html = htmlSecciones(datos([bloque("resumen_economico")]));
    expect(html).toContain("Neto mensual");
    expect(html).toMatch(/\$\s1\.000\.000/);
    expect(html).toMatch(/IVA 19 %<\/td><td>\$\s190\.000/);
    expect(html).toMatch(/Total mensual<\/td><td>\$\s1\.190\.000/);
  });

  it("deja los marcadores `{{…}}` de los textos tal cual, para resolverlos con los datos reales", () => {
    expect(htmlSecciones(datos([bloque("texto_libre", { contenidoOverride: "Para {{cuenta.nombre}}" })]))).toContain("Para {{cuenta.nombre}}");
  });
});

describe("conSecciones", () => {
  it("reemplaza el marcador (con alias y espacios) y, sin marcador, agrega al final", () => {
    expect(conSecciones("<p>A</p>{{ secciones }}<p>B</p>", "<h2>S</h2>")).toBe("<p>A</p><h2>S</h2><p>B</p>");
    expect(conSecciones("<p>A</p>{{bloque.secciones}}", "<h2>S</h2>")).toBe("<p>A</p><h2>S</h2>");
    expect(conSecciones("<p>A</p>", "<h2>S</h2>")).toBe("<p>A</p><h2>S</h2>");
    expect(conSecciones("{{secciones}}", "$&")).toBe("$&");
  });
});

describe("htmlBasePropuesta", () => {
  it("lleva título, negocio, cliente, vigencia y el marcador de secciones, y pasa el saneado", () => {
    const html = htmlBasePropuesta({ titulo: "Guardias <Planta>", negocio: "Negocio Ficticio", cliente: "Cliente Ficticio SpA", validaHasta: "30-12-2026" });
    expect(html).toContain("<h1>Guardias &lt;Planta&gt;</h1>");
    expect(html).toContain("Preparada para Cliente Ficticio SpA");
    expect(html).toContain("Vigencia hasta el 30-12-2026");
    expect(html.endsWith("{{secciones}}")).toBe(true);
    expect(sanearHtml(html).ok).toBe(true);
  });
});
