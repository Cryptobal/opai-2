// Nota de débito (56) de cargo sobre una factura emitida (CAR-234, paridad con OPAI 1.0): agrega un monto a una
// factura 33/34 ya emitida (CodRef 3 «corrige montos»). Se crea como borrador y se emite con el mismo flujo de la
// factura (`finanzas.ventas.emitir`). Distinta de la ND que anula una nota de crédito (`emitir_nota_debito`).
import { validarMontosVenta, type MontosDteVenta } from "@opai/domain";
import { totalesVenta } from "@opai/domain/ventas-lineas";

import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

/** CodRef SII de la ND de cargo: 3 corrige montos. La 2 (corrige texto) queda pendiente de decisión (D2 del PR). */
export const CODIGO_REFERENCIA_ND_CARGO = 3 as const;

type FacturaOrigen = {
  id: string;
  cuentaId: string;
  tipoDte: number;
  folio: number | null;
  estadoDte: string;
  fechaEmision: Date | null;
};

/** Reglas de la factura que recibe el cargo; lo usan el borrador y la emisión (la factura pudo cambiar entremedio). */
export function validarFacturaParaCargo<F extends FacturaOrigen>(
  f: F | null,
): F & { tipoDte: 33 | 34; folio: number } {
  if (!f) throw noEncontrado("La factura de origen");
  if (f.tipoDte !== 33 && f.tipoDte !== 34) {
    throw reglaDeNegocio("La nota de débito de cargo se emite sobre una factura (33 o 34).");
  }
  if (f.folio == null || (f.estadoDte !== "enviado" && f.estadoDte !== "aceptado")) {
    throw reglaDeNegocio("La factura de origen debe estar emitida y vigente.");
  }
  return f as F & { tipoDte: 33 | 34; folio: number };
}

/** La factura de origen del borrador, validada (tenant por RLS; mismo cliente si se indica). */
export async function cargarFacturaParaCargo(
  ctx: Pick<Contexto, "db">,
  facturaId: string,
  cuentaId?: string,
) {
  const f = validarFacturaParaCargo(
    await ctx.db.documentoEmitido.findFirst({ where: { id: facturaId } }),
  );
  if (cuentaId && f.cuentaId !== cuentaId) {
    throw reglaDeNegocio("La nota de débito debe ser del mismo cliente que la factura de origen.");
  }
  return f;
}

/** Montos de la ND de cargo: siguen el tipo de la factura (33 afecta con IVA 19 %, 34 exenta). */
export function montosNotaDebitoCargo(
  tipoOrigen: 33 | 34,
  montosLineas: readonly number[],
): MontosDteVenta {
  const montos = totalesVenta(tipoOrigen, montosLineas);
  const error = validarMontosVenta(56, montos);
  if (error) throw reglaDeNegocio(error);
  return montos;
}

/** La referencia SII a la factura (FchRef ≤ FchEmis de la ND). */
export function referenciaFacturaCargo(
  f: { tipoDte: 33 | 34; folio: number; fechaEmision: Date | null },
  motivo: string,
  emisionIso: string,
) {
  const fechaRef = f.fechaEmision ?? new Date(`${emisionIso}T00:00:00.000Z`);
  if (fechaRef.toISOString().slice(0, 10) > emisionIso) {
    throw reglaDeNegocio("La nota de débito no puede tener fecha anterior a la factura de origen.");
  }
  return {
    tipoDteRef: f.tipoDte,
    folioRef: f.folio,
    fechaRef,
    codigoRef: CODIGO_REFERENCIA_ND_CARGO,
    razonRef: motivo.slice(0, 90),
  };
}

/**
 * Un borrador 56 es una nota de débito de cargo (CAR-234): exige su factura de origen, del mismo cliente y todavía
 * vigente (pudo anularse después de crear el borrador). La ND que anula una NC no usa borrador.
 */
export async function exigirOrigenNotaDebito(
  ctx: Pick<Contexto, "db">,
  doc: { documentoReferenciaId: string | null; codigoReferencia: number | null; cuentaId: string },
): Promise<void> {
  if (!doc.documentoReferenciaId || doc.codigoReferencia !== CODIGO_REFERENCIA_ND_CARGO) {
    throw reglaDeNegocio("La nota de débito no tiene una factura de origen válida.");
  }
  await cargarFacturaParaCargo(ctx, doc.documentoReferenciaId, doc.cuentaId);
}
