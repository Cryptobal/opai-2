// Cálculo de los cambios a un borrador (CAR-248): valida con las mismas reglas que al crearlo y devuelve lo que habría
// que escribir. No toca la base: lo usan la vista previa (`dryRun`) y la escritura.
import type { z } from "zod";

import { validarMontosVenta, validarReferenciaSii, vencimientoPago } from "@opai/domain";

import { aFecha } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { PLAZO_PAGO_DEFECTO } from "./comun";
import { cargarBorradorEditable } from "./ventas-borrador-editable";
import { fechaEmisionBorrador, validarMontosDeLineas } from "./ventas-borrador-validar";
import { montosDesdeLineas, type lineaInputSchema } from "./ventas-comun";
import { cargarFacturaParaCargo, montosNotaDebitoCargo, referenciaFacturaCargo } from "./ventas-nd-cargo";

type LineaIn = z.infer<typeof lineaInputSchema>;
type RefIn = { tipoDteRef: number; folioRef: number; fechaRef: string; codigoRef: number; razonRef?: string | null | undefined };

export type CambiosBorrador = {
  doc: Awaited<ReturnType<typeof cargarBorradorEditable>>;
  fila: Record<string, unknown>;
  lineas?: { orden: number; glosa: string; monto: number; cantidad?: string; unidad?: string; precioUnitario?: number; descuentoPct?: number }[];
  referencias?: { tipoDteRef: number; folioRef: number; fechaRef: Date | null; codigoRef: number; razonRef: string | null }[];
};

const dia = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;
const DIA_MS = 86_400_000;

export async function calcularCambios(
  ctx: Contexto,
  input: { documentoId: string; lineas?: LineaIn[] | undefined; referencias?: RefIn[] | undefined; plazoPagoDias?: number | undefined; fechaEmision?: string | undefined; glosa?: string | null | undefined; motivo?: string | undefined },
): Promise<CambiosBorrador> {
  const doc = await cargarBorradorEditable(ctx, input.documentoId);
  const esNd = doc.tipoDte === 56;
  if (esNd && input.referencias) throw reglaDeNegocio("La referencia de la nota de débito es su factura de origen; no se edita.");
  if (!esNd && input.motivo !== undefined) throw reglaDeNegocio("El motivo es de la nota de débito; en una factura use la glosa.");
  if (esNd && input.glosa !== undefined) throw reglaDeNegocio("En una nota de débito el texto es el motivo.");
  const emision = fechaEmisionBorrador(input.fechaEmision ?? dia(doc.fechaEmision) ?? undefined);
  const plazoActual = doc.fechaVencimiento && doc.fechaEmision ? Math.round((doc.fechaVencimiento.getTime() - doc.fechaEmision.getTime()) / DIA_MS) : PLAZO_PAGO_DEFECTO;
  const plazo = input.plazoPagoDias ?? (plazoActual >= 0 && plazoActual <= 365 ? plazoActual : PLAZO_PAGO_DEFECTO);
  const fila: CambiosBorrador["fila"] = { fechaEmision: aFecha(emision), fechaVencimiento: aFecha(vencimientoPago(emision, plazo)) };
  const out: CambiosBorrador = { doc, fila };
  const motivo = input.motivo ?? doc.motivoNc ?? doc.glosa ?? "";
  const factura = esNd && doc.documentoReferenciaId ? await cargarFacturaParaCargo(ctx, doc.documentoReferenciaId, doc.cuentaId) : null;
  if (esNd && !factura) throw reglaDeNegocio("La nota de débito no tiene una factura de origen válida.");

  if (input.lineas) {
    validarMontosDeLineas(input.lineas);
    const montos = factura ? montosNotaDebitoCargo(factura.tipoDte, input.lineas.map((l) => l.monto)) : montosDesdeLineas(doc.tipoDte as 33 | 34, input.lineas);
    const error = validarMontosVenta(doc.tipoDte as 33 | 34 | 56, montos);
    if (error) throw reglaDeNegocio(error);
    Object.assign(fila, { montoNeto: montos.neto, montoExento: montos.exento, montoIva: montos.iva, montoOtros: montos.otros, montoTotal: montos.total });
    out.lineas = input.lineas.map((l, orden) => ({
      orden, glosa: l.glosa, monto: l.monto,
      ...(l.cantidad ? { cantidad: l.cantidad.replace(",", ".") } : {}),
      ...(l.unidad ? { unidad: l.unidad } : {}),
      ...(l.precioUnitario !== undefined ? { precioUnitario: l.precioUnitario } : {}),
      ...(l.descuentoPct !== undefined ? { descuentoPct: l.descuentoPct } : {}),
    }));
  }
  if (esNd && factura) {
    if (input.motivo !== undefined) Object.assign(fila, { glosa: motivo, motivoNc: motivo });
    out.referencias = [referenciaFacturaCargo(factura, motivo, emision)];
  } else {
    if (input.glosa !== undefined) fila["glosa"] = input.glosa?.trim() || null;
    const refs = input.referencias ?? doc.referencias.map((r) => ({ tipoDteRef: r.tipoDteRef, folioRef: r.folioRef, fechaRef: dia(r.fechaRef) ?? emision, codigoRef: r.codigoRef, razonRef: r.razonRef }));
    for (const r of refs) {
      const err = validarReferenciaSii({ codigo: r.tipoDteRef, folio: r.folioRef, fecha: r.fechaRef }, emision);
      if (err) throw reglaDeNegocio(err);
    }
    if (input.referencias) out.referencias = input.referencias.map((r) => ({ tipoDteRef: r.tipoDteRef, folioRef: r.folioRef, fechaRef: aFecha(r.fechaRef), codigoRef: r.codigoRef, razonRef: r.razonRef ?? null }));
  }
  return out;
}
