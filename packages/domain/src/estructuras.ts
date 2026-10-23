// Estructuras de sueldo en tres niveles (ADR-005): persona (excepción) → puesto → cargo.
// CLP en enteros; porcentajes en PCT_ESCALA. Fechas de calendario "aaaa-mm-dd".
import { type CLP, clp, PCT_ESCALA, porcentajeCLP, redondearCLP } from "./dinero";

export type NivelEstructura = "persona" | "puesto" | "cargo";
export type Gratificacion = "legal_25" | "monto_fijo" | "ninguna";

export type ItemEstructura = {
  tipo: "bono_fijo" | "bono_porcentual";
  nombre: string;
  monto?: number | null;
  porcentaje?: number | null;
  imponible: boolean;
};

/**
 * Un nivel define solo los conceptos que cambia: `null` = hereda del nivel más general
 * (ADR-005 y diseño "sueldo en tres niveles"). El nivel cargo define todos.
 */
export type Estructura = {
  id: string;
  nivel: NivelEstructura;
  sueldoBase: number | null;
  colacion: number | null;
  movilizacion: number | null;
  gratificacion: Gratificacion | null;
  gratificacionMonto?: number | null;
  vigenteDesde: string;
  vigenteHasta?: string | null;
  estado: "vigente" | "anulada";
  items: readonly ItemEstructura[];
};

export type Vigencia = { vigenteDesde: string; vigenteHasta?: string | null };

/** Comparación de fechas "aaaa-mm-dd" (orden lexicográfico = cronológico). */
export function vigenteEn(e: Vigencia & { estado?: string }, fecha: string): boolean {
  if (e.estado === "anulada") return false;
  return e.vigenteDesde <= fecha && (!e.vigenteHasta || fecha <= e.vigenteHasta);
}

/** Si dos vigencias comparten al menos un día. */
export function solapan(a: Vigencia, b: Vigencia): boolean {
  const finA = a.vigenteHasta ?? "9999-12-31";
  const finB = b.vigenteHasta ?? "9999-12-31";
  return a.vigenteDesde <= finB && b.vigenteDesde <= finA;
}

export type Resolucion = {
  aplica: NivelEstructura | null;
  estructura: Estructura | null;
  niveles: Record<NivelEstructura, Estructura | null>;
};

/** Resuelve la estructura efectiva a una fecha: persona → puesto → cargo. */
export function resolverEstructura(
  fecha: string,
  candidatas: Partial<Record<NivelEstructura, readonly Estructura[]>>,
): Resolucion {
  const elegir = (n: NivelEstructura) =>
    (candidatas[n] ?? [])
      .filter((e) => vigenteEn(e, fecha))
      .sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde))[0] ?? null;
  const niveles = { persona: elegir("persona"), puesto: elegir("puesto"), cargo: elegir("cargo") };
  const aplica = (["persona", "puesto", "cargo"] as const).find((n) => niveles[n]) ?? null;
  return { aplica, estructura: aplica ? niveles[aplica] : null, niveles };
}

/** Tope legal de la gratificación del Art. 50: 4,75 ingresos mínimos mensuales al año. */
export const TOPE_GRATIFICACION_IMM_ANUAL = 4.75;

/** Gratificación legal mensual: 25 % del sueldo base con tope de 4,75 IMM / 12. */
export function gratificacionLegal(sueldoBase: number, imm: number): CLP {
  const veinticinco = porcentajeCLP(clp(sueldoBase), PCT_ESCALA / 4);
  const tope = redondearCLP((TOPE_GRATIFICACION_IMM_ANUAL * imm) / 12);
  return clp(Math.min(veinticinco, tope));
}

export type Haberes = {
  sueldoBase: CLP;
  gratificacion: CLP;
  bonosImponibles: CLP;
  bonosNoImponibles: CLP;
  colacion: CLP;
  movilizacion: CLP;
  imponible: CLP;
  noImponible: CLP;
  total: CLP;
};

/** Haberes mensuales de una estructura (sin definir = 0). Colación y movilización no son imponibles. */
export function haberes(e: Estructura, imm: number): Haberes {
  const base = clp(e.sueldoBase ?? 0);
  const gratificacion =
    e.gratificacion === "legal_25"
      ? gratificacionLegal(base, imm)
      : e.gratificacion === "monto_fijo"
        ? clp(e.gratificacionMonto ?? 0)
        : clp(0);
  let bonosImponibles = 0;
  let bonosNoImponibles = 0;
  for (const item of e.items) {
    const monto =
      item.tipo === "bono_fijo" ? (item.monto ?? 0) : porcentajeCLP(base, item.porcentaje ?? 0);
    if (item.imponible) bonosImponibles += monto;
    else bonosNoImponibles += monto;
  }
  const imponible = clp(base + gratificacion + bonosImponibles);
  const colacion = e.colacion ?? 0;
  const movilizacion = e.movilizacion ?? 0;
  const noImponible = clp(colacion + movilizacion + bonosNoImponibles);
  return {
    sueldoBase: base,
    gratificacion,
    bonosImponibles: clp(bonosImponibles),
    bonosNoImponibles: clp(bonosNoImponibles),
    colacion: clp(colacion),
    movilizacion: clp(movilizacion),
    imponible,
    noImponible,
    total: clp(imponible + noImponible),
  };
}
