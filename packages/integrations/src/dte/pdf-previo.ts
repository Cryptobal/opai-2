// PDF A4 de la proforma y del estado de pago (CAR-221). Son documentos sin valor tributario: llevan un número interno,
// no un folio del SII, y no consumen CAF ni crean deuda fiscal. Mismas medidas y detalle paginado que el DTE.
import { type PDFPage, PDFDocument, StandardFonts } from "pdf-lib";

import { A4, alDerecha, ALTO, caja, centrado, GRIS, linea, MARGEN, type Recursos, texto, XFIN } from "./pdf-base";
import { capacidad, dibujarDetalle, medirFila, paginar } from "./pdf-detalle";
import { cabeceraContinuacion, numeroDePagina } from "./pdf-pagina";
import { fechaCorta, fechaLarga, pesos } from "./pdf-texto";
import type { PdfLinea, PdfParte } from "./pdf-tipos";

export type PdfPrevioInput = {
  tipo: "proforma" | "estado_pago";
  /** Número interno no tributario, por ejemplo «PF-2026-12-0042». */
  numeroInterno: string;
  version: number;
  fechaEmision: string;
  fechaVencimiento?: string;
  /** Período facturado, por ejemplo «diciembre 2026». */
  periodo: string;
  instalacion?: string;
  emisor: PdfParte;
  receptor: PdfParte;
  lineas: PdfLinea[];
  neto: number;
  exento: number;
  iva: number;
  total: number;
  /** UF usada para valorizar el período: «estimada» mientras el SII no publique la del día de emisión. */
  uf?: { valor: string; fecha: string; estimada: boolean };
  /** Referencias autorizadas ya visibles para el cliente, por ejemplo «OC 4500123 (801)». */
  referencias?: string[];
  /** Firmas de ambas partes, solo en el estado de pago. `aprobadoPor` reemplaza la firma del cliente. */
  firmas?: { aprobadoPor?: { nombre: string; fecha: string } };
};

const NOMBRE = { proforma: "PROFORMA", estado_pago: "ESTADO DE PAGO" } as const;
const CAJA_W = 202;
const ALTO_BLOQUE = 62;

function cabecera(p: PDFPage, d: PdfPrevioInput, r: Recursos) {
  texto(p, d.emisor.razon, MARGEN, 66, r.negrita, 11);
  [d.emisor.giro, d.emisor.direccion, [d.emisor.comuna, d.emisor.ciudad].filter(Boolean).join(", ")]
    .filter(Boolean)
    .forEach((l, i) => texto(p, l as string, MARGEN, 84 + i * 12, r.normal));
  const x = XFIN - CAJA_W;
  caja(p, x, 64, CAJA_W, 70, GRIS);
  centrado(p, NOMBRE[d.tipo], x + CAJA_W / 2, 76, r.negrita, 12);
  centrado(p, `N° ${d.numeroInterno}`, x + CAJA_W / 2, 94, r.negrita, 10);
  centrado(p, `Versión ${d.version}`, x + CAJA_W / 2, 110, r.normal, 8);
  centrado(p, "Sin valor tributario", x + CAJA_W / 2, 122, r.normal, 8);
  texto(p, `Fecha: ${fechaLarga(d.fechaEmision)}`, MARGEN, 156, r.normal, 9);
}

function receptor(p: PDFPage, d: PdfPrevioInput, r: Recursos) {
  caja(p, MARGEN, 179, XFIN - MARGEN, 64);
  const fila = (et: string, v: string | undefined, x: number, arriba: number, xv: number) => {
    texto(p, et, x, arriba, r.negrita);
    texto(p, v ?? "", xv, arriba, r.normal);
  };
  fila("SEÑOR(ES):", d.receptor.razon, 38, 186, 100);
  fila("R.U.T.:", d.receptor.rut, 38, 200, 100);
  fila("INSTALACIÓN:", d.instalacion, 38, 214, 100);
  fila("PERÍODO:", d.periodo, 300, 186, 372);
  fila("VENCE:", d.fechaVencimiento ? fechaCorta(d.fechaVencimiento) : "", 300, 200, 372);
  const refs = (d.referencias ?? []).join(" · ");
  fila("REFERENCIAS:", refs.slice(0, 70), 38, 228, 100);
}

function pieDocumento(p: PDFPage, d: PdfPrevioInput, r: Recursos) {
  caja(p, XFIN - 194, ALTO - 232, 194, 64);
  const fila = (et: string, v: number, arriba: number, f: Recursos["normal"]) => {
    texto(p, et, XFIN - 186, arriba, f, 9);
    alDerecha(p, `$ ${pesos(v)}`, XFIN - 10, arriba, f, 9);
  };
  fila("NETO", d.neto, ALTO - 225, r.normal);
  fila("EXENTO", d.exento, ALTO - 213, r.normal);
  fila("IVA (19%)", d.iva, ALTO - 201, r.normal);
  fila("TOTAL", d.total, ALTO - 185, r.negrita);
  if (d.uf) {
    const etiqueta = d.uf.estimada ? "UF estimada" : "UF de emisión";
    texto(p, `${etiqueta} al ${fechaCorta(d.uf.fecha)}: $ ${d.uf.valor}`, MARGEN, ALTO - 225, r.normal, 9);
    if (d.uf.estimada) texto(p, "El valor se fija con la UF oficial del día de emisión de la factura.", MARGEN, ALTO - 213, r.normal);
  }
  const aviso =
    d.tipo === "proforma"
      ? "Documento sin valor tributario. La factura se emite al confirmar."
      : "Detalle del servicio del período para la firma de ambas partes.";
  texto(p, aviso, MARGEN, ALTO - 197, r.normal);
  if (d.tipo !== "estado_pago") return;
  const firma = (x: number, rotulo: string, nombre: string) => {
    linea(p, x, x + 200, ALTO - 70, 0.6);
    centrado(p, rotulo, x + 100, ALTO - 62, r.normal, 8);
    centrado(p, nombre, x + 100, ALTO - 50, r.normal, 8);
  };
  firma(MARGEN, "Por la empresa", d.emisor.razon);
  const ap = d.firmas?.aprobadoPor;
  firma(XFIN - 200, "Por el cliente", ap ? `Aprobado en línea por ${ap.nombre} · ${fechaCorta(ap.fecha)}` : "[pendiente]");
}

/** Genera el PDF de una proforma o de un estado de pago. Mismos bytes para los mismos datos. */
export async function generarPdfPrevio(input: PdfPrevioInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${NOMBRE[input.tipo]} ${input.numeroInterno}`);
  doc.setProducer("OPAI 2.0");
  const fechaDoc = new Date(`${input.fechaEmision || "1970-01-01"}T00:00:00Z`);
  doc.setCreationDate(fechaDoc);
  doc.setModificationDate(fechaDoc);
  const r: Recursos = { normal: await doc.embedFont(StandardFonts.Helvetica), negrita: await doc.embedFont(StandardFonts.HelveticaBold) };
  const filas = input.lineas.map((l, i) => medirFila(l, i + 1));
  const cabPrimera = 253 + ALTO_BLOQUE - 40;
  const paginas = paginar(filas, capacidad(cabPrimera), capacidad(70));
  paginas.forEach((fp, i) => {
    const p = doc.addPage(A4);
    const primera = i === 0;
    if (primera) {
      cabecera(p, input, r);
      receptor(p, input, r);
    } else cabeceraContinuacion(p, `${NOMBRE[input.tipo]} N° ${input.numeroInterno}`, r);
    numeroDePagina(p, i + 1, paginas.length, r);
    dibujarDetalle(p, r, fp, primera ? cabPrimera : 70);
    if (i === paginas.length - 1) pieDocumento(p, input, r);
  });
  return doc.save();
}
