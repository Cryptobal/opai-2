// Datos de la representación impresa del DTE (CAR-221). Layout tomado de la factura de OPAI 1.0 como referencia.

export type PdfLinea = { descripcion: string; cantidad?: string; precio?: number; monto: number };

export type PdfReferencia = {
  tipoDteRef: number;
  folioRef: number;
  fechaRef?: string;
  codigoRef: number;
  razonRef?: string;
};

export type PdfParte = {
  razon: string;
  rut: string;
  giro?: string;
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  fono?: string;
};

export type PdfDteInput = {
  tipoDte: number;
  folio: number;
  fechaEmision: string;
  emisor: PdfParte;
  receptor: PdfParte;
  lineas: PdfLinea[];
  referencias?: PdfReferencia[];
  neto: number;
  exento: number;
  iva: number;
  total: number;
  timbrePdf417: string;
  glosa?: string;
  resolucion?: { numero: number; fecha: string };
  /** Oficina del SII del emisor; si falta no se imprime. */
  oficinaSii?: string;
};

export const NOMBRE_DTE: Record<number, string> = {
  33: "FACTURA ELECTRONICA",
  34: "FACTURA NO AFECTA O EXENTA ELECTRONICA",
  56: "NOTA DE DEBITO ELECTRONICA",
  61: "NOTA DE CREDITO ELECTRONICA",
};

export const NOMBRE_REF: Record<number, string> = {
  33: "Factura Electrónica",
  34: "Factura Exenta Electrónica",
  56: "Nota de Débito Electrónica",
  61: "Nota de Crédito Electrónica",
  52: "Guía de Despacho",
  801: "Orden de Compra",
  802: "HES",
  803: "Contrato",
  804: "Resolución",
};

export const CODIGO_REF: Record<number, string> = { 1: "Anula documento", 2: "Corrige texto", 3: "Corrige montos" };

/** Solo los documentos que se pueden ceder llevan la copia CEDIBLE. */
export const llevaCedible = (tipoDte: number): boolean => tipoDte === 33 || tipoDte === 34;
