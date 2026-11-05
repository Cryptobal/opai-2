import { lunesIso } from "./fechas";
import { etiquetaFlujoRemuneracion } from "./remuneracion";

export const ETIQUETAS_FLUJO = {
  otrosIngresos: "Otros ingresos",
  otrosEgresos: "Otros egresos",
  costoFactoring: "Costo factoring",
  cobrosSinFila: "Cobros",
  abonoFactoring: "Abono factoring",
  pagoProveedores: "Pago a proveedores",
} as const;

export type CeldaRealBanco = {
  semana: string;
  filaEtiqueta: string;
  monto: number;
  movimientoId: string;
  nota: string;
};

type CobroFacturaReal = { filaEtiqueta: string; monto: number };

type MovimientoReal = {
  id: string;
  fecha: string;
  monto: number;
  glosa: string;
  conciliado: boolean;
  filaCliente?: string | null;
  cobrosFactura?: CobroFacturaReal[];
  esFactoringMerma?: boolean;
  esRemuneracion?: boolean;
  /** Pago a un documento recibido (egreso a proveedores). */
  esPagoProveedor?: boolean;
};

/**
 * Capa real desde la cartola de la semana. Nunca descarta un movimiento (hallazgo 3, CAR-181):
 * lo que no tiene fila propia va a «Otros ingresos» u «Otros egresos» según su signo, de modo
 * que Σ celdas con signo = Σ movimientos con signo.
 */
export function celdasRealesDesdeMovimientos(movs: MovimientoReal[]): CeldaRealBanco[] {
  const out: CeldaRealBanco[] = [];
  for (const m of movs) {
    const semana = lunesIso(m.fecha);
    const abs = Math.abs(m.monto);
    const poner = (filaEtiqueta: string, monto = abs) =>
      out.push({ semana, filaEtiqueta, monto, movimientoId: m.id, nota: m.glosa });
    const otros = (monto = abs) =>
      poner(m.monto > 0 ? ETIQUETAS_FLUJO.otrosIngresos : ETIQUETAS_FLUJO.otrosEgresos, monto);
    if (!m.conciliado) {
      otros();
    } else if (m.esFactoringMerma) {
      // El abono del factoring entra como ingreso; solo la comisión es costo.
      poner(m.monto > 0 ? ETIQUETAS_FLUJO.abonoFactoring : ETIQUETAS_FLUJO.costoFactoring);
    } else if (m.esRemuneracion) {
      poner(etiquetaFlujoRemuneracion(m.glosa));
    } else if (m.cobrosFactura?.length) {
      let asignado = 0;
      for (const c of m.cobrosFactura) {
        poner(c.filaEtiqueta || ETIQUETAS_FLUJO.cobrosSinFila, c.monto);
        asignado += c.monto;
      }
      if (abs - asignado > 0) otros(abs - asignado);
    } else if (m.esPagoProveedor) {
      poner(ETIQUETAS_FLUJO.pagoProveedores);
    } else if (m.filaCliente) {
      poner(m.filaCliente);
    } else {
      otros();
    }
  }
  return out;
}
