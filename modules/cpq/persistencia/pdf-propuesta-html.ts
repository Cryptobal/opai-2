import { PDFDocument } from "pdf-lib";

import { type BloqueHtmlPdf, bloquesDeHtml } from "../domain/documento/html-bloques-pdf";
import type { MarcaDocumentoVista } from "./marca-documento";
import { acentoDeMarca, LINEA, TEXTO } from "./pdf/colores";
import { incrustarFuentes } from "./pdf/fuentes";
import { ANCHO_UTIL, Hoja, MARGEN } from "./pdf/hoja";
import { tabla } from "./pdf/hoja-tabla";
import type { LogoPdf } from "./pdf/logo";
import { membrete } from "./pdf/membrete";

type EntradaPdfPropuestaHtml = {
  codigo: string;
  fecha: string;
  borrador: boolean;
  marca: MarcaDocumentoVista;
  logo: LogoPdf | null;
  /** HTML saneado de la plantilla de la empresa, con los campos ya reemplazados. */
  html: string;
};

const TAM_TITULO = [20, 16, 13.5, 12, 11, 10.5] as const;

function lineas(h: Hoja, texto: string, e: Parameters<Hoja["parrafo"]>[1]) {
  for (const l of texto.split("\n")) h.parrafo(l, e);
}

function dibujar(h: Hoja, b: BloqueHtmlPdf): void {
  switch (b.t) {
    case "titulo":
      h.espacio(b.nivel <= 2 ? 12 : 8);
      h.asegurar(48);
      lineas(h, b.texto, {
        tam: TAM_TITULO[b.nivel - 1] ?? 11,
        fuente: "negrita",
        color: b.color ? acentoDeMarca(b.color) : b.nivel <= 2 ? h.acento : TEXTO,
        interlineado: 1.25,
      });
      h.espacio(4);
      return;
    case "parrafo":
      lineas(h, b.texto, { tam: 10, interlineado: 1.45, ...(b.color ? { color: acentoDeMarca(b.color) } : {}) });
      h.espacio(6);
      return;
    case "item":
      lineas(h, `${b.marca} ${b.texto}`, { tam: 10, interlineado: 1.4, x: MARGEN.x + 12, ancho: ANCHO_UTIL - 12 });
      h.espacio(2);
      return;
    case "tabla": {
      const [primera, ...resto] = b.filas;
      const ancho = Math.max(...b.filas.map((f) => f.celdas.length));
      const cabeza = primera?.encabezado ? primera.celdas : [];
      const columnas = Array.from({ length: ancho }, (_, k) => ({ titulo: cabeza[k] ?? "", peso: 1 }));
      const filas = (primera?.encabezado ? resto : b.filas).map((f) => ({ celdas: f.celdas, negrita: f.encabezado }));
      h.espacio(4);
      tabla(h, columnas, filas);
      h.espacio(8);
      return;
    }
    case "salto":
      h.nueva();
      return;
    case "regla":
      h.espacio(4);
      h.regla(LINEA, 0.6);
      h.espacio(8);
      return;
    default: {
      const nunca: never = b;
      throw new Error(`Bloque HTML desconocido: ${JSON.stringify(nunca)}`);
    }
  }
}

/** PDF de la propuesta con la plantilla HTML de la empresa: membrete de la marca, el contenido y el pie. */
export async function renderPdfPropuestaHtml(i: EntradaPdfPropuestaHtml): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Propuesta técnica ${i.codigo}`);
  doc.setProducer("OPAI");
  const h = new Hoja(doc, await incrustarFuentes(doc), acentoDeMarca(i.marca.colorPrimario));
  await membrete(h, i.marca, i.logo, { etiqueta: "Propuesta técnica", codigo: i.codigo, detalle: i.fecha });
  let saltoPendiente = false;
  let contenido = false;
  for (const b of bloquesDeHtml(i.html)) {
    if (b.t === "salto") { saltoPendiente = contenido; continue; }
    if (saltoPendiente) h.nueva();
    saltoPendiente = false;
    dibujar(h, b);
    contenido = true;
  }
  const nombre = i.marca.nombreComercial ?? i.marca.razonSocial ?? "";
  h.cerrar({ pie: i.marca.piePagina ?? `${nombre} · ${i.codigo}`, marcaAgua: i.borrador ? "BORRADOR" : null });
  return doc.save();
}
