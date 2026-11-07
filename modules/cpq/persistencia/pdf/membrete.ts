import type { MarcaDocumentoVista } from "../marca-documento";
import { TENUE } from "./colores";
import { ANCHO_UTIL, type Hoja, MARGEN } from "./hoja";
import type { LogoPdf } from "./logo";

/** Logo (o nombre) de la empresa a la izquierda; tipo de documento, código y fecha a la derecha. */
export async function membrete(
  h: Hoja,
  marca: MarcaDocumentoVista,
  logo: LogoPdf | null,
  d: { etiqueta: string; codigo: string; detalle: string },
): Promise<void> {
  const top = h.y;
  const empresa = marca.nombreComercial ?? marca.razonSocial ?? "";
  let alto = 0;
  if (logo) {
    const img =
      logo.formato === "png" ? await h.doc.embedPng(logo.bytes) : await h.doc.embedJpg(logo.bytes);
    alto = h.imagen(img, MARGEN.x, top, 150, 42);
  } else if (empresa) {
    h.linea(empresa, top - 14, {
      tam: 15,
      fuente: "negrita",
      color: h.acento,
      ancho: ANCHO_UTIL / 2,
    });
    alto = 18;
  }
  const mitad = ANCHO_UTIL / 2;
  const x = MARGEN.x + mitad;
  h.linea(d.etiqueta.toUpperCase(), top - 8, {
    tam: 7.8,
    fuente: "semi",
    color: TENUE,
    x,
    ancho: mitad,
    alinear: "der",
  });
  h.linea(d.codigo, top - 24, { tam: 13, fuente: "mono", x, ancho: mitad, alinear: "der" });
  h.linea(d.detalle, top - 38, { tam: 8.5, color: TENUE, x, ancho: mitad, alinear: "der" });
  h.y = top - Math.max(alto, 44) - 10;
  h.regla(h.acento, 1.4);
  h.espacio(14);
}

export function etiquetaSeccion(h: Hoja, texto: string): void {
  h.asegurar(40);
  h.espacio(8);
  h.parrafo(texto.toUpperCase(), { tam: 8, fuente: "semi", color: h.acento });
}
