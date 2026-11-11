import { describe, expect, it } from "vitest";

import { catalogoNovedades } from "./catalogo";
import {
  bloquesNovedad,
  hrefSeguroNovedad,
  textoPlanoNovedad,
  trozosNovedad,
  type BloqueNovedad,
  type TrozoNovedad,
} from "./formato";

/** Junta el texto visible de todos los bloques (lo que la persona lee en pantalla). */
function visible(bloques: BloqueNovedad[]): string {
  return bloques
    .map((b) =>
      b.tipo === "lista" ? b.items.map((i) => textoPlanoNovedad(i)).join("\n") : textoPlanoNovedad(b.trozos),
    )
    .join("\n");
}

describe("formato de novedades (CAR-316)", () => {
  it("convierte negrita, cursiva y código en trozos sin dejar asteriscos", () => {
    const t = trozosNovedad("Usa **«Editar»** y *cursiva* con `{persona.rut}`.");
    expect(t).toEqual<TrozoNovedad[]>([
      { tipo: "texto", texto: "Usa " },
      { tipo: "negrita", trozos: [{ tipo: "texto", texto: "«Editar»" }] },
      { tipo: "texto", texto: " y " },
      { tipo: "cursiva", trozos: [{ tipo: "texto", texto: "cursiva" }] },
      { tipo: "texto", texto: " con " },
      { tipo: "codigo", texto: "{persona.rut}" },
      { tipo: "texto", texto: "." },
    ]);
  });

  it("anida cursiva dentro de negrita", () => {
    expect(trozosNovedad("**hola *mundo* ya**")).toEqual([
      {
        tipo: "negrita",
        trozos: [
          { tipo: "texto", texto: "hola " },
          { tipo: "cursiva", trozos: [{ tipo: "texto", texto: "mundo" }] },
          { tipo: "texto", texto: " ya" },
        ],
      },
    ]);
  });

  it("deja como texto un asterisco suelto y los guiones bajos dentro de palabras", () => {
    expect(textoPlanoNovedad(trozosNovedad("3 * 4 = 12 y nombre_de_archivo"))).toBe(
      "3 * 4 = 12 y nombre_de_archivo",
    );
  });

  it("arma párrafos, listas con viñeta y numeradas, y títulos", () => {
    const b = bloquesNovedad(
      "## Qué cambia\n\nPrimera línea\nsigue igual.\n\n- uno\n- **dos**\n  continúa\n\n1. a\n2. b",
    );
    expect(b.map((x) => x.tipo)).toEqual(["titulo", "parrafo", "lista", "lista"]);
    expect(textoPlanoNovedad((b[1] as { trozos: TrozoNovedad[] }).trozos)).toBe(
      "Primera línea sigue igual.",
    );
    const lista = b[2] as Extract<BloqueNovedad, { tipo: "lista" }>;
    expect(lista.ordenada).toBe(false);
    expect(lista.items.map(textoPlanoNovedad)).toEqual(["uno", "dos continúa"]);
    expect((b[3] as Extract<BloqueNovedad, { tipo: "lista" }>).ordenada).toBe(true);
  });

  it("no habilita HTML: las etiquetas quedan como texto", () => {
    const t = trozosNovedad('<img src=x onerror="alert(1)"> **ok**');
    expect(t[0]).toEqual({ tipo: "texto", texto: '<img src=x onerror="alert(1)"> ' });
  });

  it("solo enlaza rutas internas o https", () => {
    expect(hrefSeguroNovedad("/finanzas/ventas?estado=borrador")).toBe("/finanzas/ventas?estado=borrador");
    expect(hrefSeguroNovedad("https://opai.cl/ayuda")).toBe("https://opai.cl/ayuda");
    expect(hrefSeguroNovedad("javascript:alert(1)")).toBeNull();
    expect(hrefSeguroNovedad("//malo.com")).toBeNull();
    expect(hrefSeguroNovedad("/\\malo.com")).toBeNull();
    expect(hrefSeguroNovedad("data:text/html,hola")).toBeNull();
    expect(trozosNovedad("[aquí](javascript:alert)")).toEqual([{ tipo: "texto", texto: "aquí" }]);
    expect(trozosNovedad("[Ventas](/finanzas/ventas)")).toEqual([
      { tipo: "enlace", href: "/finanzas/ventas", trozos: [{ tipo: "texto", texto: "Ventas" }] },
    ]);
  });

  it("ninguna novedad publicada muestra asteriscos ni marcas de lista al dibujarse", () => {
    for (const e of catalogoNovedades()) {
      const texto = visible(bloquesNovedad(e.descripcion));
      expect(texto, e.id).not.toMatch(/\*\*|(^|\n)\s*[-*] /);
    }
  });
});
