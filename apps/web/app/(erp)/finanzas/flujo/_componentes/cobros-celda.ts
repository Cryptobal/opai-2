import type { Planilla } from "./datos";

/** Fila del sistema «Cobros esperados» (igual que `FILA_COBROS_ESPERADOS` del módulo Finanzas). */
export const FILA_COBROS_ESPERADOS = "00000000-0000-4000-8000-000000000005";

export type OrigenCobro = "manual" | "promedio" | "vencimiento" | "emision";

/** Lo que trae la celda desde `finanzas.planilla.obtener`. */
export type CobroApi = { documentoId: string; fechaEsperada: string | null; origen: OrigenCobro };

export type CobroCelda = {
  documentoId: string;
  etiqueta: string;
  monto: number;
  fechaEsperada: string | null;
  origen: OrigenCobro;
};

export const TEXTO_ORIGEN: Record<OrigenCobro, string> = {
  manual: "fijada a mano",
  promedio: "promedio de pago del cliente",
  vencimiento: "vencimiento",
  emision: "emisión",
};

/**
 * Facturas por cobrar detrás de la celda «Cobros esperados» de una semana, con su fecha esperada (CAR-396).
 * Solo las que tienen fecha propia: programaciones y depósitos del factor no se cambian desde aquí.
 */
export function cobrosDeSemana(p: Planilla, filaId: string, semana: string): CobroCelda[] {
  if (filaId !== FILA_COBROS_ESPERADOS) return [];
  const out: CobroCelda[] = [];
  for (const c of p.celdas) {
    if (c.filaId !== filaId || c.semana !== semana || !c.cobro) continue;
    out.push({
      documentoId: c.cobro.documentoId,
      etiqueta: (c.nota ?? "Factura").split(" · cobro esperado")[0] ?? "Factura",
      monto: c.monto,
      fechaEsperada: c.cobro.fechaEsperada,
      origen: c.cobro.origen,
    });
  }
  return out.sort((a, b) => b.monto - a.monto || a.documentoId.localeCompare(b.documentoId));
}
