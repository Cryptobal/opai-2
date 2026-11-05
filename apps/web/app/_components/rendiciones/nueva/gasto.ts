import type { ItemRendicion } from "../tipos";

/** Un gasto mientras se llena: los textos son del formulario; el monto va como dígitos (InputMonto). */
export type Gasto = {
  clave: string;
  documentoId: string | null;
  vistaPrevia: string | null;
  nombreArchivo: string | null;
  tipoDocumento: "boleta" | "factura";
  monto: string;
  fecha: string;
  folio: string;
  proveedor: string;
  descripcion: string;
  /** Motivo de un gasto sin respaldo (borradores creados por MCP): se conserva al corregir. */
  sinRespaldoMotivo: string;
};

export type ErroresGasto = Partial<
  Record<"documento" | "monto" | "fecha" | "folio" | "proveedor" | "descripcion", string>
>;

export const gastoVacio = (hoy: string): Gasto => ({
  clave: globalThis.crypto.randomUUID(),
  documentoId: null,
  vistaPrevia: null,
  nombreArchivo: null,
  tipoDocumento: "boleta",
  monto: "",
  fecha: hoy,
  folio: "",
  proveedor: "",
  descripcion: "",
  sinRespaldoMotivo: "",
});

export const gastoDe = (i: ItemRendicion): Gasto => ({
  clave: i.id,
  documentoId: i.documentoId,
  vistaPrevia: null,
  nombreArchivo: null,
  tipoDocumento: i.tipoDocumento,
  monto: String(i.monto),
  fecha: i.fecha,
  folio: i.folio ?? "",
  proveedor: i.proveedor,
  descripcion: i.descripcion,
  sinRespaldoMotivo: i.sinRespaldoMotivo ?? "",
});

/** Reglas del paso 2 (el servidor las vuelve a validar): monto, fecha no futura y datos del documento. */
export function validarGasto(g: Gasto, hoy: string, exigirRespaldo: boolean): ErroresGasto {
  const e: ErroresGasto = {};
  if (exigirRespaldo && !g.documentoId) e.documento = "Sube la foto de la boleta o factura.";
  const monto = Number(g.monto);
  if (!Number.isInteger(monto) || monto < 1) e.monto = "Escribe el monto en pesos.";
  else if (monto > 50_000_000) e.monto = "El monto máximo por gasto es $50.000.000.";
  if (!g.fecha) e.fecha = "Indica la fecha del gasto.";
  else if (g.fecha > hoy) e.fecha = "La fecha no puede ser futura.";
  if (!g.folio.trim()) e.folio = `Escribe el folio de la ${g.tipoDocumento}.`;
  if (!g.proveedor.trim()) e.proveedor = "Escribe el proveedor.";
  if (!g.descripcion.trim()) e.descripcion = "Cuenta en qué se gastó.";
  return e;
}

/** Gasto en el formato de la capacidad. */
export const itemDe = (g: Gasto) => ({
  fecha: g.fecha,
  proveedor: g.proveedor.trim(),
  folio: g.folio.trim(),
  tipoDocumento: g.tipoDocumento,
  descripcion: g.descripcion.trim(),
  monto: Number(g.monto),
  ...(g.documentoId
    ? { documentoId: g.documentoId }
    : g.sinRespaldoMotivo
      ? { sinRespaldoMotivo: g.sinRespaldoMotivo }
      : {}),
});

export const totalDe = (gastos: readonly Gasto[]) =>
  gastos.reduce((s, g) => s + (Number(g.monto) || 0), 0);

export type Paso = "documento" | "datos" | "resumen";
export const TITULO: Record<Paso, string> = {
  documento: "Paso 1 de 2 · Boleta o factura",
  datos: "Paso 2 de 2 · Datos del gasto",
  resumen: "Resumen y envío",
};

/** Agrega el gasto a la lista o, si ya estaba (se editó), lo reemplaza en su lugar. */
export const conGasto = (lista: readonly Gasto[], g: Gasto): Gasto[] =>
  lista.some((x) => x.clave === g.clave)
    ? lista.map((x) => (x.clave === g.clave ? g : x))
    : [...lista, g];
