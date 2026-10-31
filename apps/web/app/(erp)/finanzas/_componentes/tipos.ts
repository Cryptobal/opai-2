// Formas que las pantallas de Finanzas leen de las capacidades `finanzas.*` (los esquemas de salida
// viven en packages/capabilities/src/finanzas). Solo lo que las pantallas usan.

export type Sugerencia = { centroCostoId: string; origen: "proveedor" | "ultima_compra" };

export type Compra = {
  id: string;
  proveedorId: string;
  proveedorRut: string;
  proveedorNombre: string;
  tipoDte: number;
  folio: number;
  fechaEmision: string;
  fechaRecepcion: string;
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoOtros: number;
  montoTotal: number;
  estadoRecepcion: "pendiente_revision" | "aceptado" | "reclamado";
  venceReclamo: string;
  diasParaReclamo: number;
  vencimientoPago: string;
  centroCostoId: string | null;
  centroCostoNombre: string | null;
  sugerencia: Sugerencia | null;
  origen: string;
  glosa: string | null;
  estadoPago: "sin_conciliar";
};

export type Libro = {
  items: Compra[];
  siguiente: string | null;
  resumen: { documentos: number; sinCentroCosto: number; neto: number; iva: number; total: number };
};

export type Proveedor = {
  id: string;
  rut: string;
  razonSocial: string;
  giro: string | null;
  email: string | null;
  telefono: string | null;
  plazoPagoDias: number;
  cuentaGastoId: string | null;
  cuentaPorPagarId: string | null;
  centroCostoId: string | null;
  notas: string | null;
  activo: boolean;
};

export type Centro = {
  id: string | null;
  tipo: "instalacion" | "general";
  instalacionId: string | null;
  nombre: string;
};

export type Cuenta = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "activo" | "pasivo" | "patrimonio" | "ingreso" | "costo" | "gasto";
  naturaleza: "deudora" | "acreedora";
  grupo: "corriente" | "no_corriente" | null;
  exigeCentroCosto: boolean;
  aceptaAsientos: boolean;
  padreId: string | null;
  claveSistema: string | null;
  activa: boolean;
};

export type AlertaPlan = {
  codigo: string;
  severidad: "error" | "aviso";
  cuenta: string;
  mensaje: string;
};

/** Referencia que las capacidades aceptan para un centro de costo. */
export type CentroRef = { tipo: "general" } | { tipo: "instalacion"; instalacionId: string };

export const refDe = (c: Centro): CentroRef =>
  c.tipo === "general" || !c.instalacionId
    ? { tipo: "general" }
    : { tipo: "instalacion", instalacionId: c.instalacionId };

/** Clave estable de un centro para controles de selección (el id puede ser nulo si nunca se usó). */
export const claveCentro = (c: Centro) => (c.tipo === "general" ? "general" : (c.instalacionId ?? ""));

/** "2026-10-06" → "06-10-2026" sin pasar por Date (evita el corrimiento de zona horaria). */
export const diaCL = (iso: string) => iso.split("-").reverse().join("-");

export const NOMBRE_DTE: Record<number, string> = {
  33: "Factura",
  34: "Factura exenta",
  56: "Nota de débito",
  61: "Nota de crédito",
};
