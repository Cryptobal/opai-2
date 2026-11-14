import { redondearCLP } from "../dinero";
import type { Estructura } from "../estructuras";
import { costoEmpleadorPorPersona } from "../remuneraciones/costo-empresa";
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

const proporcional = (monto: number | null | undefined, dias: number) =>
  monto == null ? monto ?? null : redondearCLP((monto * dias) / DIAS_MES_LIQUIDACION);

const sumar = (l: LineaLiquidacion[]) => l.reduce((s, x) => s + x.monto, 0);
const conMonto = (l: LineaLiquidacion[]) => l.filter((x) => x.monto !== 0);

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
  const capa: Estructura = {
    ...e.capa,
    sueldoBase: proporcional(e.capa.sueldoBase, dias),
    colacion: proporcional(e.capa.colacion, dias),
    movilizacion: proporcional(e.capa.movilizacion, dias),
    gratificacionMonto: proporcional(e.capa.gratificacionMonto, dias),
    items: [
      ...e.capa.items.map((i) => (i.tipo === "bono_fijo" ? { ...i, monto: proporcional(i.monto, dias) } : i)),
      ...(horasExtra > 0
        ? [{ tipo: "bono_fijo" as const, nombre: "Horas extra", monto: horasExtra, porcentaje: null, imponible: true }]
        : []),
    ],
  };
  const r = costoEmpleadorPorPersona({
    sueldo: { capa }, contrato: e.contrato, afp: e.afp, salud: e.salud,
    jornadaMinutosSemanales: e.jornadaMinutosSemanales, mutualAdicional: e.mutualAdicional,
    provisiones: { diasVacacionesCorridosAnuales: 21, baseVacaciones: "sin_gratificacion",
      baseIndemnizacion: "imponible", mesesAntiguedad: 0, probabilidadIndemnizacion: 1_000_000 },
  }, juego);
  const h = r.desglose.haberes;
  const d = r.desglose;
  const haberes = conMonto([
    { concepto: "Sueldo base", monto: h.sueldoBase },
    { concepto: "Gratificación", monto: h.gratificacion },
    { concepto: "Horas extra", monto: horasExtra },
    { concepto: "Bonos imponibles", monto: h.bonosImponibles - horasExtra },
    { concepto: "Colación", monto: h.colacion },
    { concepto: "Movilización", monto: h.movilizacion },
    { concepto: "Bonos no imponibles", monto: h.bonosNoImponibles },
  ]);
  const descuentosLegales = conMonto([
    { concepto: "AFP", monto: d.afpClp },
    { concepto: "Salud", monto: d.saludClp },
    { concepto: "Seguro de cesantía", monto: d.cesantiaTrabajadorClp },
    { concepto: "Impuesto único", monto: d.impuestoUnicoClp },
  ]);
  const otrosDescuentos = conMonto([
    { concepto: "Anticipos", monto: n.anticipos },
    { concepto: "Cuotas de préstamo", monto: n.prestamos },
    { concepto: "Descuentos", monto: n.descuentos },
  ]);
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
    diasTrabajados: dias, haberes, descuentosLegales, otrosDescuentos,
    totalHaberes: h.total, imponible: h.imponible,
    totalDescuentosLegales: sumar(descuentosLegales), totalOtrosDescuentos: totalOtros,
    liquido, costoEmpresa: r.costoEmpresaMensualClp,
    capaId: e.capa.id, huellaJuego: r.huellaJuegoDeValores, advertencias,
  };
}
