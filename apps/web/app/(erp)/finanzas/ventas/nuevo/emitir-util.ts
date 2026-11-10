import { validarReferenciaSii } from "@opai/domain";
import { montoLineaVenta } from "@opai/domain/ventas-lineas";

import { parseDescuento } from "../programacion/_componentes/tipos";

/** Línea del formulario: `precio` guarda solo dígitos (pesos), `cantidad` y `descuento` el texto tipeado. */
export type LineaForm = { glosa: string; cantidad: string; precio: string; descuento: string; unidad?: string };

export const LINEA_NUEVA: LineaForm = { glosa: "", cantidad: "1", precio: "", descuento: "0" };

const CANTIDAD_OK = /^\d{1,10}([.,]\d{1,4})?$/;

/** Referencia del catálogo SII en el formulario (801 OC, 802 HES, 803 contrato, 804 resolución, 52 guía). */
/** Tipos que se pueden emitir desde esta pantalla: facturas (con borrador) y notas (se emiten directo). */
export type TipoEmision = "33" | "34" | "61" | "56";

export type RefForm = {
  tipo: string;
  folioTexto: string;
  fecha: string;
  razon: string;
  tocada?: boolean;
};

export const REF_VACIA: RefForm = { tipo: "801", folioTexto: "", fecha: "", razon: "" };

/** Primer problema de las referencias (código, folio y fecha reales, no posterior a hoy) o null si están bien. */
export function problemaReferencias(refs: readonly RefForm[], hoyIso: string): string | null {
  for (const r of refs) {
    const folio = Number(r.folioTexto);
    const e = validarReferenciaSii(
      { codigo: Number(r.tipo), folio: Number.isInteger(folio) ? folio : 0, fecha: r.fecha },
      hoyIso,
    );
    if (e) return e;
  }
  return null;
}

/**
 * Qué decir de las referencias sin gritar antes de tiempo: el error (rojo) solo sale de una fila que la persona ya
 * tocó; si el envío está bloqueado por una fila que aún no tocó (p. ej. recién agregada y vacía), se muestra una
 * ayuda neutra. El bloqueo en sí lo decide `problemaReferencias`, que no cambia.
 */
export function mensajeReferencias(
  refs: readonly RefForm[],
  hoyIso: string,
): { error: string | null; ayuda: string | null } {
  const error = problemaReferencias(
    refs.filter((r) => r.tocada),
    hoyIso,
  );
  if (error) return { error, ayuda: null };
  const bloqueada = problemaReferencias(refs, hoyIso) !== null;
  return {
    error: null,
    ayuda: bloqueada
      ? "Completa el folio y la fecha de cada referencia, o quita la fila vacía."
      : null,
  };
}

export type ItemPreflight = { codigo: string; ok: boolean; mensaje: string; bloqueante: boolean };

export function parseMonto(texto: string): number | null {
  const n = Number(texto.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

/** Monto neto de la línea (cantidad × precio − descuento, mismo cálculo que el servidor) o null si falta algo. */
export function montoDeLinea(l: LineaForm): number | null {
  const precio = parseMonto(l.precio);
  const descuento = parseDescuento(l.descuento);
  const cantidad = l.cantidad.trim();
  if (precio == null || descuento == null || !CANTIDAD_OK.test(cantidad)) return null;
  const monto = montoLineaVenta({ cantidad, precioUnitario: precio, descuentoPct: descuento });
  return monto >= 1 && monto <= 2_000_000_000 ? monto : null;
}

type EntradaBorrador = {
  cuentaId: string;
  tipoDte: "33" | "34";
  plazo: number;
  fechaEmision: string;
  lineas: LineaForm[];
  glosa: string;
  referencias?: readonly RefForm[];
  dryRun: boolean;
};

/** Input de `finanzas.ventas.crear_borrador`; las líneas ya deben estar validadas. */
export function construirInputBorrador(e: EntradaBorrador) {
  return {
    cuentaId: e.cuentaId,
    tipoDte: Number(e.tipoDte) as 33 | 34,
    plazoPagoDias: e.plazo,
    fechaEmision: e.fechaEmision,
    lineas: e.lineas.map((l) => {
      const descuento = parseDescuento(l.descuento);
      return {
        glosa: l.glosa.trim(),
        monto: montoDeLinea(l)!,
        cantidad: l.cantidad.trim(),
        precioUnitario: parseMonto(l.precio)!,
        ...(descuento ? { descuentoPct: descuento } : {}),
      };
    }),
    ...(e.glosa.trim() ? { glosa: e.glosa.trim() } : {}),
    ...(e.referencias?.length
      ? {
          referencias: e.referencias.map((r) => ({
            tipoDteRef: Number(r.tipo),
            folioRef: Number(r.folioTexto),
            fechaRef: r.fecha,
            ...(r.razon.trim() ? { razonRef: r.razon.trim() } : {}),
          })),
        }
      : {}),
    dryRun: e.dryRun,
  };
}
