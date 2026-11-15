import { PCT_ESCALA, clp, porcentajeCLP } from "../dinero";
import type { Estructura } from "../estructuras";
import { costoEmpleadorPorPersona } from "../remuneraciones/costo-empresa";
import type { AdministradoraAFP } from "../remuneraciones/indicadores";
import type { JuegoDeValores } from "../remuneraciones/valores";
import { fechaAnticipoQuincenal } from "./anticipo";
import type { ModoAnticipo } from "./tipos";

/**
 * Costo de remuneraciones proyectado para el flujo de caja (CAR-344). No es una liquidación: usa la
 * capa de sueldo vigente con el motor de costo empleador y devuelve solo totales por concepto y fecha
 * de pago, nunca datos de una persona. Función pura.
 */
export const CONCEPTOS_COSTO_PROYECTADO = ["sueldos", "anticipo", "previred", "turnos_extra"] as const;
export type ConceptoCostoProyectado = (typeof CONCEPTOS_COSTO_PROYECTADO)[number];

/** Plazo legal de pago electrónico de cotizaciones: día 13 del mes siguiente (si no hay plazo verificado). */
export const PREVIRED_DIA_DEFECTO = 13;

export type PersonaACostear = {
  capa: Estructura;
  contrato: "indefinido" | "plazo_fijo";
  afp: AdministradoraAFP;
  salud: { tipo: "fonasa" } | { tipo: "isapre"; planUf: number };
  jornadaMinutosSemanales: number;
  anticipo: { modo: ModoAnticipo; valor: number; diaMes: number } | null;
};

export type PlazosPago = {
  /** Día en que se pagan los sueldos; si el mes es más corto, el último día. */
  sueldoDia: number;
  /** true: los sueldos del mes se pagan el mes siguiente. */
  sueldoMesSiguiente: boolean;
  /** Fecha de pago de Previred de este mes (aaaa-mm-dd). */
  previredFecha: string;
};

export type ItemCostoProyectado = {
  fecha: string;
  concepto: ConceptoCostoProyectado;
  monto: number;
  personas: number;
  estimado: boolean;
};

export type MesCalendario = { anio: number; mes: number };

export const mesSiguiente = ({ anio, mes }: MesCalendario): MesCalendario =>
  mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };

/** Fecha por defecto de Previred del mes: día 13 del mes siguiente. */
export function previredPorDefecto(m: MesCalendario): string {
  const s = mesSiguiente(m);
  return fechaAnticipoQuincenal(s.anio, s.mes, PREVIRED_DIA_DEFECTO);
}

/**
 * Meses cuyo pago puede caer en [desde, hasta]: desde el mes anterior a `desde` (Previred y los sueldos
 * pagados el mes siguiente) hasta el mes de `hasta`.
 */
export function mesesQueCubren(desde: string, hasta: string): MesCalendario[] {
  const [a, m] = desde.split("-").map(Number) as [number, number];
  let actual: MesCalendario = m === 1 ? { anio: a - 1, mes: 12 } : { anio: a, mes: m - 1 };
  const fin = hasta.slice(0, 7);
  const meses: MesCalendario[] = [];
  const clave = (x: MesCalendario) => `${x.anio}-${String(x.mes).padStart(2, "0")}`;
  while (clave(actual) <= fin) {
    meses.push(actual);
    actual = mesSiguiente(actual);
  }
  return meses;
}

type Acumulado = Map<string, { fecha: string; concepto: ConceptoCostoProyectado; monto: number; personas: number }>;

function sumar(acc: Acumulado, fecha: string, concepto: ConceptoCostoProyectado, monto: number) {
  if (monto <= 0) return;
  const k = `${fecha}|${concepto}`;
  const previo = acc.get(k) ?? { fecha, concepto, monto: 0, personas: 0 };
  acc.set(k, { ...previo, monto: previo.monto + monto, personas: previo.personas + 1 });
}

/** Anticipo del mes de una persona, acotado al líquido estimado. */
function montoAnticipo(p: PersonaACostear, sueldoBase: number, liquido: number): number {
  if (!p.anticipo || p.anticipo.valor <= 0) return 0;
  const bruto = p.anticipo.modo === "monto_fijo"
    ? p.anticipo.valor
    : porcentajeCLP(clp(sueldoBase), p.anticipo.valor * (PCT_ESCALA / 10_000));
  return Math.min(bruto, Math.max(liquido, 0));
}

/**
 * Totales del mes por concepto y fecha de pago. `sinCalculo` cuenta a quienes no se pudo costear
 * (capa incompleta o dato inválido); el llamador lo informa como advertencia, sin identificarlos.
 */
export function costoProyectadoDelMes(
  m: MesCalendario,
  personas: readonly PersonaACostear[],
  juego: JuegoDeValores,
  mutualAdicional: number,
  plazos: PlazosPago,
): { items: ItemCostoProyectado[]; sinCalculo: number } {
  const acc: Acumulado = new Map();
  const pagoSueldo = plazos.sueldoMesSiguiente ? mesSiguiente(m) : m;
  const fechaSueldo = fechaAnticipoQuincenal(pagoSueldo.anio, pagoSueldo.mes, plazos.sueldoDia);
  let sinCalculo = 0;
  for (const p of personas) {
    let r: ReturnType<typeof costoEmpleadorPorPersona>;
    try {
      r = costoEmpleadorPorPersona({
        sueldo: { capa: p.capa },
        contrato: p.contrato,
        afp: p.afp,
        salud: p.salud,
        jornadaMinutosSemanales: p.jornadaMinutosSemanales,
        mutualAdicional,
        provisiones: { diasVacacionesCorridosAnuales: 21, baseVacaciones: "sin_gratificacion",
          baseIndemnizacion: "imponible", mesesAntiguedad: 0, probabilidadIndemnizacion: 1_000_000 },
      }, juego);
    } catch {
      sinCalculo += 1;
      continue;
    }
    const d = r.desglose;
    const anticipo = montoAnticipo(p, d.haberes.sueldoBase, r.liquidoEstimadoClp);
    if (anticipo > 0 && p.anticipo)
      sumar(acc, fechaAnticipoQuincenal(m.anio, m.mes, p.anticipo.diaMes), "anticipo", anticipo);
    sumar(acc, fechaSueldo, "sueldos", r.liquidoEstimadoClp - anticipo);
    sumar(acc, plazos.previredFecha, "previred",
      d.afpClp + d.saludClp + d.cesantiaTrabajadorClp + d.sisClp + d.cesantiaEmpleadorClp + d.mutualClp + d.reformaClp);
  }
  const items = [...acc.values()].map((i) => ({ ...i, estimado: true }));
  return { items, sinCalculo };
}
