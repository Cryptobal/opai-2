import { lunesIso } from "./fechas";
import { etiquetaFlujoRemuneracion } from "./remuneracion";

export const ETIQUETAS_FLUJO = {
  otrosIngresos: "Otros ingresos",
  otrosEgresos: "Otros egresos",
  costoFactoring: "Costo factoring",
  cobrosSinFila: "Cobros",
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
};

/** Agrupa movimientos conciliados (capa real) hacia filas del flujo por semana ISO. */
export function celdasRealesDesdeMovimientos(movs: MovimientoReal[]): CeldaRealBanco[] {
  const out: CeldaRealBanco[] = [];
  for (const m of movs) {
    if (!m.conciliado) {
      out.push({
        semana: lunesIso(m.fecha),
        filaEtiqueta: m.monto > 0 ? ETIQUETAS_FLUJO.otrosIngresos : ETIQUETAS_FLUJO.otrosEgresos,
        monto: Math.abs(m.monto),
        movimientoId: m.id,
        nota: m.glosa,
      });
      continue;
    }
    if (m.esFactoringMerma) {
      out.push({
        semana: lunesIso(m.fecha),
        filaEtiqueta: ETIQUETAS_FLUJO.costoFactoring,
        monto: Math.abs(m.monto),
        movimientoId: m.id,
        nota: m.glosa,
      });
      continue;
    }
    if (m.esRemuneracion) {
      out.push({
        semana: lunesIso(m.fecha),
        filaEtiqueta: etiquetaFlujoRemuneracion(m.glosa),
        monto: Math.abs(m.monto),
        movimientoId: m.id,
        nota: m.glosa,
      });
      continue;
    }
    if (m.cobrosFactura?.length) {
      for (const c of m.cobrosFactura) {
        out.push({
          semana: lunesIso(m.fecha),
          filaEtiqueta: c.filaEtiqueta || ETIQUETAS_FLUJO.cobrosSinFila,
          monto: c.monto,
          movimientoId: m.id,
          nota: m.glosa,
        });
      }
      continue;
    }
    if (m.filaCliente) {
      out.push({
        semana: lunesIso(m.fecha),
        filaEtiqueta: m.filaCliente,
        monto: Math.abs(m.monto),
        movimientoId: m.id,
        nota: m.glosa,
      });
    }
  }
  return out;
}
