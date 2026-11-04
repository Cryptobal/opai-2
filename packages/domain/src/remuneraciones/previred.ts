// Captura mensual de indicadores previsionales (CAR-193): lectura, fusión con el vigente y banda de sanidad.
import type { DatosIndicadores, Indicador } from "./indicadores";
import {
  leerCesantia, leerComisionesAfp, leerImm, leerSis, leerTopes,
} from "./previred-lectores";
import { textoPlano } from "./previred-texto";

/** Indicadores que la página de Previred permite leer. El resto (reforma, mutual, jornada, impuesto) no sale de ahí. */
export const INDICADORES_PREVIRED = ["imm", "topes", "afp", "sis", "cesantia"] as const satisfies readonly Indicador[];
export type IndicadorPrevired = (typeof INDICADORES_PREVIRED)[number];

export type Lectura = { [K in IndicadorPrevired]?: DatosIndicadores[K] };
export type Vigentes = { [K in IndicadorPrevired]?: DatosIndicadores[K] };
export type ResultadoLectura = { lectura: Lectura; fallidos: IndicadorPrevired[] };

/**
 * Lee la página y completa con el vigente lo que Previred no publica (tope de indemnización, cotización
 * obligatoria y salud 7 %). Sin vigente no se puede completar, y ese indicador queda como fallido.
 */
export function leerPrevired(html: string, vigentes: Vigentes): ResultadoLectura {
  const texto = textoPlano(html);
  const lectura: Lectura = {};
  const imm = leerImm(texto);
  if (imm != null) lectura.imm = imm;
  const topes = leerTopes(texto);
  if (topes && vigentes.topes) lectura.topes = { ...vigentes.topes, ...topes };
  const afpVigente = vigentes.afp;
  const comisiones = afpVigente ? leerComisionesAfp(texto, afpVigente.obligatoria) : null;
  if (afpVigente && comisiones) lectura.afp = { ...afpVigente, comisiones };
  const sis = leerSis(texto);
  if (sis != null) lectura.sis = sis;
  const cesantia = leerCesantia(texto);
  if (cesantia) lectura.cesantia = cesantia;
  const fallidos = INDICADORES_PREVIRED.filter((k) => lectura[k] === undefined);
  return { lectura, fallidos };
}

export function sonIguales(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Variación relativa máxima aceptada por captura; mayor que esto la lectura es sospechosa y no se propone. */
export const BANDA_VARIACION: Record<IndicadorPrevired, number> = {
  imm: 0.15, topes: 0.15, afp: 0.5, sis: 0.5, cesantia: 0.5,
};

function numeros(v: unknown): number[] {
  if (typeof v === "number") return [v];
  if (v && typeof v === "object") return Object.values(v).flatMap(numeros);
  return [];
}

/** True si ningún componente numérico se aleja del vigente más que la banda del indicador. */
export function dentroDeBanda(clave: IndicadorPrevired, vigente: unknown, nuevo: unknown): boolean {
  const a = numeros(vigente);
  const b = numeros(nuevo);
  if (a.length !== b.length) return false;
  return a.every((x, i) => {
    const y = b[i] as number;
    if (x === y) return true;
    return x !== 0 && Math.abs(y - x) / Math.abs(x) <= BANDA_VARIACION[clave];
  });
}
