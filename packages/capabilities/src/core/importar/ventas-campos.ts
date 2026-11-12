// Campos del importador de documentos de venta emitidos (CAR-283). Los nombres alternativos incluyen los
// encabezados del detalle del Registro de Ventas (RCV) del SII, la fuente que cualquier empresa chilena tiene.
import type { DefinicionImportador, FilaNormalizada } from "@opai/domain/importacion";

import { CAMPOS_CUENTA, CAMPO_ID_EXTERNO, entero, fecha, texto } from "./comun";

export type DatosDocumentoVenta = {
  cuentaId: string;
  tipoDte: number;
  folio: number;
  fechaEmision: Date;
  fechaVencimiento: Date | null;
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoTotal: number;
  /** Lo ya cobrado en el sistema de origen: queda como base del saldo, igual que en la apertura (CAR-168). */
  montoCobrado: number;
  estadoDte: string;
  estadoCobro: string;
  cesionEstado: string;
  cesionProveedor: string | null;
  glosa: string;
  refTipoDte: number | null;
  refFolio: number | null;
  codigoReferencia: number | null;
};

export const TIPOS_FACTURA = new Set([33, 34]);
export const TIPOS_NOTA = new Set([56, 61]);

export const DEF_DOCUMENTOS_VENTA: DefinicionImportador = {
  id: "documentos_venta",
  etiqueta: "Facturas y notas emitidas",
  descripcion:
    "Historial de facturas, notas de crédito y notas de débito ya emitidas. Se reconocen por tipo y folio. No se envían al SII ni usan folios de OPAI.",
  campos: [
    CAMPO_ID_EXTERNO,
    ...CAMPOS_CUENTA,
    { clave: "tipo_dte", etiqueta: "Tipo de documento", tipo: "opcion", requerido: true, sinonimos: ["tipo doc", "tipo", "tipo dte", "tipo documento"], ejemplo: "33",
      opciones: { "33": ["factura", "factura electronica", "factura afecta"], "34": ["factura exenta", "factura no afecta o exenta"], "56": ["nota de debito", "nota debito"], "61": ["nota de credito", "nota credito"] } },
    { clave: "folio", etiqueta: "Folio", tipo: "entero", requerido: true, sinonimos: ["numero", "nro", "n°", "número"], ejemplo: "1898" },
    { clave: "fecha_emision", etiqueta: "Fecha de emisión", tipo: "fecha", requerido: true, sinonimos: ["fecha docto", "fecha documento", "fecha", "emision"], ejemplo: "05-11-2026" },
    { clave: "fecha_vencimiento", etiqueta: "Fecha de vencimiento", tipo: "fecha", sinonimos: ["vencimiento"], ejemplo: "05-12-2026" },
    { clave: "monto_neto", etiqueta: "Monto neto", tipo: "entero", sinonimos: ["neto"], ejemplo: "1000000" },
    { clave: "monto_exento", etiqueta: "Monto exento", tipo: "entero", sinonimos: ["exento"], ejemplo: "0" },
    { clave: "monto_iva", etiqueta: "IVA", tipo: "entero", sinonimos: ["monto iva", "iva recuperable"], ejemplo: "190000" },
    { clave: "monto_total", etiqueta: "Monto total", tipo: "entero", requerido: true, sinonimos: ["total", "monto total"], ejemplo: "1190000" },
    { clave: "monto_cobrado", etiqueta: "Monto ya cobrado", tipo: "entero", sinonimos: ["cobrado", "pagado", "monto pagado"], ejemplo: "1190000",
      ayuda: "Lo que el cliente ya pagó. Vacío: se asume cobrada entera (historial). Escribe 0 si todavía se debe. Solo cuenta en facturas." },
    { clave: "estado_dte", etiqueta: "Estado ante el SII", tipo: "opcion", sinonimos: ["estado"], ejemplo: "aceptado",
      opciones: { aceptado: ["aceptada", "emitida", "vigente"], anulado_nc: ["anulada", "anulado", "anulada por nota de credito"], rechazado: ["rechazada"] } },
    { clave: "cedida", etiqueta: "Cedida en factoring", tipo: "booleano", sinonimos: ["cesion", "factoring"], ejemplo: "no" },
    { clave: "factor", etiqueta: "Factoring que la recibió", tipo: "texto", sinonimos: ["cesionario", "factor"], ejemplo: "", largoMaximo: 120 },
    { clave: "glosa", etiqueta: "Glosa", tipo: "texto", sinonimos: ["descripcion", "detalle"], ejemplo: "Servicio de seguridad octubre", largoMaximo: 500 },
    { clave: "ref_tipo_dte", etiqueta: "Tipo del documento que corrige (notas)", tipo: "entero", sinonimos: ["tipo referencia", "tipo doc referencia"], ejemplo: "33" },
    { clave: "ref_folio", etiqueta: "Folio del documento que corrige (notas)", tipo: "entero", sinonimos: ["folio referencia", "folio doc referencia"], ejemplo: "1897" },
    { clave: "codigo_referencia", etiqueta: "Qué hace la nota", tipo: "opcion", sinonimos: ["codref", "codigo referencia"], ejemplo: "1",
      opciones: { "1": ["anula", "anula el documento"], "2": ["corrige texto"], "3": ["corrige montos"] } },
  ],
};

/** Lee la fila con los valores por defecto; las validaciones las hace el plan. */
export function datosDocumento(f: FilaNormalizada, cuentaId: string) {
  const tipoDte = Number(texto(f.datos["tipo_dte"]) ?? 0);
  const total = entero(f.datos["monto_total"]) ?? 0;
  const neto = entero(f.datos["monto_neto"]);
  const exento = entero(f.datos["monto_exento"]);
  const iva = entero(f.datos["monto_iva"]);
  const conDesglose = neto !== null || exento !== null || iva !== null;
  // Sin desglose: la exenta va entera a exento; las demás se separan con el IVA de 19 %.
  const n = conDesglose ? (neto ?? 0) : tipoDte === 34 ? 0 : Math.round(total / 1.19);
  const e = conDesglose ? (exento ?? 0) : tipoDte === 34 ? total : 0;
  const i = conDesglose ? (iva ?? 0) : total - n - e;
  const cedida = f.datos["cedida"] === true;
  const esFactura = TIPOS_FACTURA.has(tipoDte);
  const cobradoDato = entero(f.datos["monto_cobrado"]);
  // Historial sin dato de pago: se asume cobrado. Si no, años de facturas pagadas entrarían como deuda vencida
  // al flujo de caja y a la cobranza. Lo que todavía se debe se indica con el monto (0 = nada cobrado).
  const supuestaCobrada = esFactura && !cedida && cobradoDato === null;
  const cobrado = esFactura && !cedida ? Math.max(0, Math.min(cobradoDato ?? total, total)) : 0;
  const datos: Omit<DatosDocumentoVenta, "estadoCobro"> = {
    cuentaId, tipoDte, folio: entero(f.datos["folio"]) ?? 0,
    fechaEmision: fecha(f.datos["fecha_emision"]) ?? new Date(0), fechaVencimiento: fecha(f.datos["fecha_vencimiento"]),
    montoNeto: n, montoExento: e, montoIva: i, montoTotal: total, montoCobrado: cobrado,
    estadoDte: texto(f.datos["estado_dte"]) ?? "aceptado",
    cesionEstado: cedida ? "cedido" : "no_cedido", cesionProveedor: cedida ? texto(f.datos["factor"]) : null,
    glosa: texto(f.datos["glosa"]) ?? "Documento histórico importado",
    refTipoDte: entero(f.datos["ref_tipo_dte"]), refFolio: entero(f.datos["ref_folio"]),
    codigoReferencia: texto(f.datos["codigo_referencia"]) ? Number(texto(f.datos["codigo_referencia"])) : null,
  };
  const estadoCobro = cedida ? "cedida" : cobrado <= 0 ? "pendiente" : cobrado + 1 >= total ? "pagada" : "pagada_parcial";
  const montosValidos = [n, e, i, total].every((m) => m >= 0) && !(tipoDte === 34 && i !== 0) && !(tipoDte === 33 && n <= 0 && e <= 0);
  return { datos: { ...datos, estadoCobro } satisfies DatosDocumentoVenta, conDesglose, supuestaCobrada, montosValidos };
}
