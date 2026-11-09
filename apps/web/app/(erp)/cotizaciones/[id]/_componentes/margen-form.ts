import { type InstrumentosCompletos, parcialInstrumentos, type ValoresTexto, valoresIniciales } from "@/lib/instrumentos-valores";

/** Parámetros financieros de la versión tal como los entrega `cpq.cotizaciones.ficha` (solo con `cpq:costos.ver`). */
export type ParametrosVersion = {
  mesesContrato: number;
  mesesPactados: boolean;
  margenModo: string;
  margenObjetivoPct: number | null;
  /** Mínimo y alerta que la empresa configuró (enteros escalados); `null` si no los fijó. */
  margenMinimoPct?: number | null;
  margenAlertaPct?: number | null;
  sobrescrito: boolean;
  instrumentos: InstrumentosCompletos;
  /** Valores por defecto del modelo (para marcar campos «Sobrescrito»). */
  instrumentosDefecto: InstrumentosCompletos;
};

/** 1 % = 10.000 en la escala de porcentajes de CPQ (100.000 = 10 %). */
export const PCT_UNO = 10_000;
export const PASO_MARGEN = 5_000;
export const MARGEN_MAXIMO = 999_999;
export const MARGEN_DEFECTO = 120_000;

export const MODOS_MARGEN = [
  { id: "margen_sobre_venta", etiqueta: "Venta" },
  { id: "markup", etiqueta: "Markup" },
  { id: "margen_sobre_mano_de_obra", etiqueta: "Mano de obra" },
] as const;

export type EstadoMargen = {
  margenPct: number;
  modo: string;
  meses: string;
  garantia: boolean;
  rc: boolean;
  financiero: boolean;
  valores: ValoresTexto;
};

export function estadoInicialMargen(p: ParametrosVersion): EstadoMargen {
  return {
    margenPct: p.margenObjetivoPct ?? MARGEN_DEFECTO,
    modo: p.margenModo,
    meses: String(p.mesesContrato),
    garantia: p.instrumentos.garantia.habilitada,
    rc: p.instrumentos.rc.habilitada,
    financiero: p.instrumentos.financiero.habilitado,
    valores: valoresIniciales(p.instrumentos),
  };
}

export const pctTexto = (escalado: number) => `${(escalado / PCT_UNO).toFixed(1).replace(".", ",")} %`;

export function mesesValidos(texto: string): number | null {
  const n = Number.parseInt(texto, 10);
  return Number.isInteger(n) && n >= 1 && n <= 120 ? n : null;
}

/** Entrada de `cpq.versiones.parametros`: solo lo que cambia respecto de lo guardado. */
export function entradaParametros(versionId: string, e: EstadoMargen, base: ParametrosVersion) {
  const valores = parcialInstrumentos(valoresIniciales(base.instrumentos), e.valores);
  const meses = mesesValidos(e.meses);
  return {
    versionId,
    margenModo: e.modo,
    margenObjetivoPct: e.margenPct,
    ...(meses !== null ? { mesesContrato: meses } : {}),
    instrumentos: {
      garantia: { ...valores.garantia, habilitada: e.garantia },
      rc: { ...valores.rc, habilitada: e.rc },
      financiero: { ...valores.financiero, habilitado: e.financiero },
    },
  };
}

export function hayCambios(e: EstadoMargen, base: ParametrosVersion): boolean {
  const i = estadoInicialMargen(base);
  return (Object.keys(i) as (keyof EstadoMargen)[]).some((k) => JSON.stringify(i[k]) !== JSON.stringify(e[k]));
}
