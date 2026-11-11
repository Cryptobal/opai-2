// Datos de la representación impresa del DTE (CAR-221). Layout tomado de la factura de OPAI 1.0 como referencia.

export type PdfLinea = { descripcion: string; cantidad?: string; precio?: number; descuentoPct?: number; monto: number };

export type PdfReferencia = {
  tipoDteRef: number;
  folioRef: number;
  fechaRef?: string;
  codigoRef: number;
  razonRef?: string;
};

export type PdfLogo = { bytes: Uint8Array; formato: "png" | "jpg" };

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
  /** `null` solo en un borrador: aún no tiene folio. */
  folio: number | null;
  fechaEmision: string;
  emisor: PdfParte;
  receptor: PdfParte;
  lineas: PdfLinea[];
  referencias?: PdfReferencia[];
  neto: number;
  exento: number;
  iva: number;
  total: number;
  /** `null` solo en un borrador: el timbre nace al firmar. */
  timbrePdf417: string | null;
  /** Vista previa sin valor tributario: lleva marca «BORRADOR», sin folio, timbre ni copia cedible. */
  borrador?: boolean;
  glosa?: string;
  resolucion?: { numero: number; fecha: string };
  /** Logo de la empresa (de Configuración › Marca), PNG o JPG; si falta o no se puede leer, el PDF sigue con la razón social. */
  logo?: PdfLogo;
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
