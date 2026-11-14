import { costoEmpleadorPorPersona } from "../remuneraciones/costo-empresa";
import { capaDelMes, lineasDe } from "./liquidacion-partes";
import type { Estructura } from "../estructuras";
import { horasExtraClp } from "../remuneraciones/horas-extra";
import type { AdministradoraAFP } from "../remuneraciones/indicadores";
import { minimoPorJornada } from "../remuneraciones/jornada";
import { indicadorUsado, type JuegoDeValores } from "../remuneraciones/valores";

/**
 * Liquidación mensual de una persona (Brief 27, CAR-99). Usa el motor del Núcleo con la capa de sueldo
 * proporcional a los días trabajados (mes de 30 días), suma las horas extra con R19 como haber
 * imponible y descuenta anticipos, cuotas de préstamo y descuentos del líquido. Función pura.
 */
export const DIAS_MES_LIQUIDACION = 30;
/** Tope de referencia de los descuentos acordados (art. 58 CT). Solo avisa (CAR-455, opción A). */
const TOPE_DESCUENTOS_PCT = 15;

export type NovedadesLiquidacion = {
  diasLicencia: number;
  diasAusencia: number;
  minutosExtra: number;
  anticipos: number;
  prestamos: number;
  descuentos: number;
};

export type EntradaLiquidacion = {
  capa: Estructura;
  contrato: "indefinido" | "plazo_fijo";
  afp: AdministradoraAFP;
  salud: { tipo: "fonasa" } | { tipo: "isapre"; planUf: number };
  jornadaMinutosSemanales: number;
  mutualAdicional: number;
  /** Días del mes con vínculo vigente (1–30). */
  diasVinculo: number;
  novedades: NovedadesLiquidacion;
};

export type LineaLiquidacion = { concepto: string; monto: number };

export type Liquidacion = {
  diasTrabajados: number;
  haberes: LineaLiquidacion[];
  descuentosLegales: LineaLiquidacion[];
  otrosDescuentos: LineaLiquidacion[];
  /** Aportes del empleador (no salen del líquido): los informa el LRE (41xx). */
  aportesEmpleador: LineaLiquidacion[];
  diasLicencia: number;
  /** Datos que pide la nómina de Previred: institución y bases con tope del mes. */
  prevision: { afp: AdministradoraAFP; salud: "fonasa" | "isapre"; basePrevisional: number; baseCesantia: number };
  totalHaberes: number;
  imponible: number;
  totalDescuentosLegales: number;
  totalOtrosDescuentos: number;
  liquido: number;
  costoEmpresa: number;
  capaId: string;
  huellaJuego: string;
  advertencias: string[];
};

const sumar = (l: LineaLiquidacion[]) => l.reduce((s, x) => s + x.monto, 0);

export function liquidacionDelMes(e: EntradaLiquidacion, juego: JuegoDeValores): Liquidacion {
  const n = e.novedades;
  const dias = Math.max(0, Math.min(e.diasVinculo, DIAS_MES_LIQUIDACION) - n.diasLicencia - n.diasAusencia);
  const imm = indicadorUsado(juego, "imm").valor;
  const jornadaLegal = indicadorUsado(juego, "jornada").valor;
  const baseCompleta = e.capa.sueldoBase ?? 0;
  const horasExtra = n.minutosExtra > 0
    ? horasExtraClp({ sueldoBaseClp: baseCompleta, immClp: imm, jornadaLegalHoras: jornadaLegal,
      jornadaMinutosSemanales: e.jornadaMinutosSemanales, minutosExtra: n.minutosExtra })
    : 0;
  const r = costoEmpleadorPorPersona({
    sueldo: { capa: capaDelMes(e.capa, dias, horasExtra) }, contrato: e.contrato, afp: e.afp, salud: e.salud,
    jornadaMinutosSemanales: e.jornadaMinutosSemanales, mutualAdicional: e.mutualAdicional,
    provisiones: { diasVacacionesCorridosAnuales: 21, baseVacaciones: "sin_gratificacion",
      baseIndemnizacion: "imponible", mesesAntiguedad: 0, probabilidadIndemnizacion: 1_000_000 },
  }, juego);
  const h = r.desglose.haberes;
  const { haberes, descuentosLegales, otrosDescuentos, aportesEmpleador } = lineasDe(r.desglose, n, horasExtra);
  const totalOtros = sumar(otrosDescuentos);
  const liquido = r.liquidoEstimadoClp - totalOtros;
  const minimo = minimoPorJornada(imm, e.jornadaMinutosSemanales, jornadaLegal);
  const advertencias = [
    ...(baseCompleta < minimo ? ["Sueldo base de la capa bajo el ingreso mínimo proporcional a la jornada."] : []),
    ...(liquido < 0 ? ["Líquido negativo: los descuentos superan lo que queda por pagar."] : []),
    ...((n.prestamos + n.descuentos) * 100 > h.total * TOPE_DESCUENTOS_PCT && h.total > 0
      ? [`Préstamos y descuentos superan el ${TOPE_DESCUENTOS_PCT} % de los haberes: revisar el tope legal.`]
      : []),
  ];
  return {
    diasTrabajados: dias, haberes, descuentosLegales, otrosDescuentos, aportesEmpleador,
    diasLicencia: Math.min(n.diasLicencia, DIAS_MES_LIQUIDACION),
    prevision: { afp: e.afp, salud: e.salud.tipo, basePrevisional: r.desglose.basePrevisionalClp, baseCesantia: r.desglose.baseCesantiaClp },
    totalHaberes: h.total, imponible: h.imponible,
    totalDescuentosLegales: sumar(descuentosLegales), totalOtrosDescuentos: totalOtros,
    liquido, costoEmpresa: r.costoEmpresaMensualClp,
    capaId: e.capa.id, huellaJuego: r.huellaJuegoDeValores, advertencias,
  };
}
