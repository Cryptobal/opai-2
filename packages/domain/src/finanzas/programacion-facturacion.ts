// Fecha proyectada de la factura de una programación, separada del día en que se genera el borrador
// (CAR-221). Contrato de 1.0: el día de generación crea el borrador y manda la proforma o el estado de pago;
// la factura se proyecta aparte, y `diasFacturacion` (0–120) prevalece sobre el momento configurado.
import { fechaDelMes, sumarDiasIso } from "./programacion";

export const MOMENTOS_FACTURA = ["AL_EMITIR", "DIA_FIJO"] as const;
export type MomentoFactura = (typeof MOMENTOS_FACTURA)[number];
export const MESES_RELATIVOS_FACTURA = ["MES_ACTUAL", "MES_SIGUIENTE"] as const;
export type MesRelativoFactura = (typeof MESES_RELATIVOS_FACTURA)[number];
export const DIAS_FACTURACION_MAX = 120;

export type ReglaFactura = "dias_facturacion" | "dia_fijo" | "al_generar";

export type FacturaProgramada = {
  diasFacturacion: number | null;
  momento: string;
  diaFijo: number | null;
  mesRelativo: string;
};

/** Qué regla fija la fecha de la factura y cuál es esa fecha. Un valor desconocido cae en «al generar». */
export function fechaFacturaProyectada(
  fechaGeneracion: string,
  p: FacturaProgramada,
): { fecha: string; regla: ReglaFactura } {
  if (p.diasFacturacion !== null && p.diasFacturacion >= 0 && p.diasFacturacion <= DIAS_FACTURACION_MAX) {
    return { fecha: sumarDiasIso(fechaGeneracion, p.diasFacturacion), regla: "dias_facturacion" };
  }
  if (p.momento === "DIA_FIJO" && p.diaFijo !== null) {
    const [anio = 0, mes = 1] = fechaGeneracion.split("-").map(Number);
    const total = anio * 12 + (mes - 1) + (p.mesRelativo === "MES_SIGUIENTE" ? 1 : 0);
    const a = Math.floor(total / 12);
    const m = (total % 12) + 1;
    return { fecha: fechaDelMes(a, m, p.diaFijo), regla: "dia_fijo" };
  }
  return { fecha: fechaGeneracion, regla: "al_generar" };
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Mes y año del período para el asunto («Proforma - Cliente - Noviembre - 2026»). */
export function mesYAnio(fecha: string): { mes: string; anio: string } {
  const [anio = "", mes = "1"] = fecha.split("-");
  return { mes: MESES[Number(mes) - 1] ?? mes, anio };
}
