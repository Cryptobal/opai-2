// Cálculo de un período sin escribir (BRIEF-26 · CAR-159).
import {
  fechaUfDe,
  type LineaProgramacionMonto,
  montosProgramacion,
  motivoNoActivable,
  validarMontosVenta,
} from "@opai/domain";

import type { Contexto } from "../types";
import { motivoSinUf, ufCentavosDelDia } from "./ventas-programacion-uf";

export type ResultadoPeriodo = {
  periodo: string;
  fecha: string;
  estado: "generado" | "omitido" | "ya_generado";
  motivo: string | null;
  documentoId: string | null;
  montoTotal: number | null;
  ufCentavos: number | null;
  fechaFactura: string | null;
};

type LineaFila = {
  glosa: string;
  cantidad: { toString(): string };
  precioUnitarioClp: bigint | null;
  precioUnitarioUf: bigint | null;
  descuentoPct: number;
  exento: boolean;
};

export type ProgramacionGenerable = {
  id: string;
  nombre: string;
  activa: boolean;
  cuentaId: string | null;
  instalacionId: string | null;
  tipoDte: number;
  plazoPagoDias: number;
  politicaUf: string | null;
  diaUf: number | null;
  diasFacturacion: number | null;
  facturaTiming: string;
  facturaDia: number | null;
  facturaMesRelativo: string;
  autoEnvioProforma: boolean;
  autoEnvioEstadoPago: boolean;
  lineas: LineaFila[];
};

export const omitido = (periodo: string, fecha: string, motivo: string): ResultadoPeriodo => ({
  periodo,
  fecha,
  estado: "omitido",
  motivo,
  documentoId: null,
  montoTotal: null,
  ufCentavos: null,
  fechaFactura: null,
});

export const aLineaMonto = (l: LineaFila): LineaProgramacionMonto => ({
  glosa: l.glosa,
  cantidad: l.cantidad.toString(),
  precioUnitarioClp: l.precioUnitarioClp,
  precioUnitarioUf: l.precioUnitarioUf,
  descuentoPct: l.descuentoPct,
  exento: l.exento,
});

/** Cálculo sin escribir: montos del período o el motivo por el que no se puede generar. */
export async function calcularPeriodo(
  ctx: Contexto,
  p: ProgramacionGenerable,
  periodo: string,
  fecha: string,
  ufEstimada: bigint | null = null,
  /** true: usar `ufEstimada` sin consultar la UF exacta (proyecciones en lote, sin N+1). */
  soloEstimada = false,
) {
  const motivo = motivoNoActivable(p);
  if (motivo) return { ok: false as const, resultado: omitido(periodo, fecha, motivo) };
  const usaUf = p.lineas.some((l) => l.precioUnitarioUf !== null);
  const fechaUf = fechaUfDe(p.politicaUf, p.diaUf, fecha);
  const exacta = usaUf && !soloEstimada ? await ufCentavosDelDia(ctx.db, fechaUf) : null;
  const uf = usaUf ? (exacta ?? ufEstimada) : null;
  if (usaUf && uf === null)
    return { ok: false as const, resultado: omitido(periodo, fecha, motivoSinUf(fechaUf)) };
  const calc = montosProgramacion(p.tipoDte, p.lineas.map(aLineaMonto), uf);
  if (!calc.ok) return { ok: false as const, resultado: omitido(periodo, fecha, calc.motivo) };
  const error = validarMontosVenta(p.tipoDte as 33 | 34, calc.montos);
  if (error) return { ok: false as const, resultado: omitido(periodo, fecha, error) };
  return { ok: true as const, calc, uf };
}
