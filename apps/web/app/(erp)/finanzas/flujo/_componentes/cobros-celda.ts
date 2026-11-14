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

/** Fila del sistema «IVA a pagar» (igual que `FILA_IVA` del módulo Finanzas). */
export const FILA_IVA = "00000000-0000-4000-8000-000000000006";

/** Lo que trae la celda de IVA desde `finanzas.planilla.obtener` (CAR-397). */
export type IvaApi = { periodo: string; postergado: boolean; fechaPago: string };
export type IvaCelda = IvaApi & { monto: number };

/** IVA a pagar en la semana: mes del IVA, si está postergado a M+2 y el día de pago. */
export function ivaDeSemana(p: Planilla, filaId: string, semana: string): IvaCelda[] {
  if (filaId !== FILA_IVA) return [];
  return p.celdas.flatMap((c) =>
    c.filaId === filaId && c.semana === semana && c.iva ? [{ ...c.iva, monto: c.monto }] : [],
  );
}

/** Hoja que abre una celda que no se edita a mano: los cobros esperados o el IVA. */
export type HojaEspecial = { tipo: "cobros" | "iva"; semana: string };

export function hojaEspecial(p: Planilla, filaId: string, semana: string): HojaEspecial | null {
  if (cobrosDeSemana(p, filaId, semana).length) return { tipo: "cobros", semana };
  if (ivaDeSemana(p, filaId, semana).length) return { tipo: "iva", semana };
  return null;
}
