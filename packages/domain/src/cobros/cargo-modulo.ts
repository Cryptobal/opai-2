/**
 * Cobro por módulo (ADR-071, BRIEF-35). Decide si el módulo de una empresa se factura en un mes y
 * cuánto, con aritmética entera: CLP en pesos, UF en diezmilésimas (`UF_ESCALA`) y el descuento en
 * `PCT_ESCALA`. Sin base de datos ni fechas del sistema: el período y las fechas llegan como texto.
 */
import { PCT_ESCALA, redondearRazonCLP, UF_ESCALA } from "../dinero";

export const MONEDAS_COBRO = ["CLP", "UF"] as const;
export type MonedaCobro = (typeof MONEDAS_COBRO)[number];

export type CondicionCobro = {
  moneda: MonedaCobro;
  /** Pesos (CLP) o UF × 10.000 (UF). */
  precioMensual: number;
  /** Día (aaaa-mm-dd) desde el que se cobra; null: no se cobra. */
  cobroDesde: string | null;
  /** Último día de la prueba (aaaa-mm-dd); el cobro empieza al día siguiente. */
  pruebaHasta: string | null;
  /** Descuento en `PCT_ESCALA` (100 % = 1.000.000). */
  descuentoPct: number;
};

/** Por qué un módulo se factura o no en un mes. */
export const MOTIVOS_COBRO = {
  factura: "Se factura",
  sin_condicion: "Sin condición comercial",
  sin_inicio: "Sin fecha de inicio del cobro",
  modulo_inactivo: "Módulo no contratado o suspendido",
  en_prueba: "En prueba",
  cobro_futuro: "El cobro empieza después",
  bonificado: "Sin costo (precio 0 o descuento total)",
} as const;
export type MotivoCobro = keyof typeof MOTIVOS_COBRO;

export type CargoCalculado = {
  facturable: boolean;
  motivo: MotivoCobro;
  /** Primer día cobrado del mes, si se factura. */
  desde: string | null;
  diasCobrados: number;
  diasMes: number;
  /** Monto bruto del mes antes del descuento, en la moneda de la condición. */
  bruto: number;
  descuento: number;
  /** Monto a facturar en la moneda de la condición (pesos o UF × 10.000). */
  monto: number;
};

const PERIODO = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Primer y último día (aaaa-mm-dd) de un período aaaa-mm, y sus días. */
export function limitesDelPeriodo(periodo: string) {
  const m = PERIODO.exec(periodo);
  if (!m) throw new RangeError(`Período inválido: ${periodo}`);
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return { inicio: `${periodo}-01`, fin: `${periodo}-${String(dias).padStart(2, "0")}`, dias };
}

/** Día siguiente a una fecha aaaa-mm-dd. */
export function diaSiguiente(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const sinCargo = (motivo: MotivoCobro, diasMes: number): CargoCalculado => ({
  facturable: false,
  motivo,
  desde: null,
  diasCobrados: 0,
  diasMes,
  bruto: 0,
  descuento: 0,
  monto: 0,
});

/**
 * Cargo de un módulo en un mes. Se factura si el módulo está activo o en prueba, tiene condición
 * con inicio del cobro y el cobro empieza a más tardar el último día del mes. El primer mes es
 * proporcional a los días desde el inicio; los siguientes, completos. Una prueba vencida se cobra
 * desde el día siguiente aunque el módulo siga marcado «prueba»; una prueba sin fin no se cobra.
 */
export function cargoDelMes(
  condicion: CondicionCobro | null,
  estadoModulo: string | null,
  periodo: string,
): CargoCalculado {
  const { inicio, fin, dias } = limitesDelPeriodo(periodo);
  if (estadoModulo !== "activo" && estadoModulo !== "trial")
    return sinCargo("modulo_inactivo", dias);
  if (!condicion) return sinCargo("sin_condicion", dias);
  if (estadoModulo === "trial" && !condicion.pruebaHasta) return sinCargo("en_prueba", dias);
  const trasPrueba = condicion.pruebaHasta ? diaSiguiente(condicion.pruebaHasta) : null;
  // Sin inicio explícito, el cobro parte al terminar la prueba; sin ninguno de los dos, no parte.
  let desde = condicion.cobroDesde ?? trasPrueba;
  if (!desde) return sinCargo("sin_inicio", dias);
  if (trasPrueba && trasPrueba > desde) desde = trasPrueba;
  if (desde > fin)
    return sinCargo(
      condicion.pruebaHasta && condicion.pruebaHasta >= fin ? "en_prueba" : "cobro_futuro",
      dias,
    );
  if (desde < inicio) desde = inicio;
  const diasCobrados = Number(fin.slice(8)) - Number(desde.slice(8)) + 1;
  const bruto = redondearRazonCLP(
    BigInt(condicion.precioMensual) * BigInt(diasCobrados),
    BigInt(dias),
  );
  const descuento = redondearRazonCLP(
    BigInt(bruto) * BigInt(condicion.descuentoPct),
    BigInt(PCT_ESCALA),
  );
  const monto = bruto - descuento;
  if (monto <= 0) return { ...sinCargo("bonificado", dias), desde, diasCobrados };
  return {
    facturable: true,
    motivo: "factura",
    desde,
    diasCobrados,
    diasMes: dias,
    bruto,
    descuento,
    monto,
  };
}

/**
 * Monto en CLP (pesos enteros). En UF usa el valor de la UF en centavos de CLP (como lo publica
 * `core.indicadores.uf_utm`); sin UF devuelve null.
 */
export function aClp(monto: number, moneda: MonedaCobro, ufCentavos: number | null): number | null {
  if (moneda === "CLP") return monto;
  if (ufCentavos === null || ufCentavos <= 0) return null;
  return redondearRazonCLP(BigInt(monto) * BigInt(ufCentavos), BigInt(UF_ESCALA * 100));
}

/** UF escrita por una persona («2,5» o «2.5», hasta 4 decimales) a UF × 10.000. */
export function ufDesdeTexto(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,4})?$/.test(t)) return null;
  const [ent, dec = ""] = t.split(".");
  const n = Number(ent) * UF_ESCALA + Number(dec.padEnd(4, "0"));
  return Number.isSafeInteger(n) ? n : null;
}
