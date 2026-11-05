/**
 * Reglas del catálogo comercial (CAR-204): qué se puede cobrar, qué necesita cada parte y cómo se
 * escribe un precio de lista. Funciones puras; sin base de datos.
 */
import { formatearClp, formatearUf } from "../formato";
import type { FormaCobro, MonedaCobro, UnidadCobro } from "./catalogo";
import { UNIDADES_COBRO } from "./catalogo";
import { ENTRADAS_CATALOGO } from "./catalogo-entradas";
import {
  type EntradaCatalogo,
  esIncluidoEnBase,
  MODULO_FINANZAS,
  PARTES_FINANZAS,
} from "./catalogo-modulos";

export const entradaCatalogo = (id: string): EntradaCatalogo | undefined =>
  ENTRADAS_CATALOGO.find((e) => e.id === id);

/** Lo incluido en el plan base no es cobrable (no tiene precio aparte). */
export const tienePrecioAparte = (id: string) =>
  entradaCatalogo(id) !== undefined && !esIncluidoEnBase(id);

/**
 * Partes de Finanzas de una empresa. Sin partes declaradas (null o vacío) tiene todas: así Gard no
 * cambia (ADR-072).
 */
export function partesDeEmpresa(declaradas?: readonly string[] | null): ReadonlySet<string> {
  const validas = (declaradas ?? []).filter((p) =>
    (PARTES_FINANZAS as readonly string[]).includes(p),
  );
  return new Set(validas.length ? validas : PARTES_FINANZAS);
}

/**
 * Partes con precio en una empresa a partir de los ids que tienen condición comercial: con Finanzas
 * entero tiene las siete; si no, las que tengan su propia condición.
 */
export function partesConPrecio(idsConCondicion: Iterable<string>): ReadonlySet<string> {
  const ids = new Set(idsConCondicion);
  if (ids.has(MODULO_FINANZAS)) return new Set(PARTES_FINANZAS);
  return new Set(PARTES_FINANZAS.filter((p) => ids.has(p)));
}

/**
 * Qué falta para fijar precio o abrir prueba a `id`: null si se cumple todo, o el mensaje, por
 * ejemplo «Flujo de caja necesita Bancos». `contratadas` son los ids ya contratados en la empresa.
 */
export function dependenciaFaltante(id: string, contratadas: ReadonlySet<string>): string | null {
  const e = entradaCatalogo(id);
  if (!e) return null;
  const nombre = (x: string) => entradaCatalogo(x)?.nombre ?? x;
  for (const alternativas of e.dependencias) {
    if (alternativas.some((a) => contratadas.has(a))) continue;
    return `${e.nombre} necesita ${alternativas.map(nombre).join(" o ")}`;
  }
  return null;
}

export type PrecioLista = {
  moneda: MonedaCobro;
  forma: FormaCobro;
  unidad: UnidadCobro | null;
  /** Mensual (fijo) o por unidad: pesos o UF × 10.000. */
  precio: number;
  minimoMensual: number | null;
};

const enMoneda = (n: number, m: MonedaCobro) => (m === "UF" ? formatearUf(n) : formatearClp(n));

/** UF sin ceros de más: «UF 5» (entero) o «UF 0,10»; pesos como siempre. */
function monto(n: number, m: MonedaCobro): string {
  return m === "UF" && n % 10_000 === 0 ? `UF\u00a0${n / 10_000}` : enMoneda(n, m);
}

/** «UF 0,10 por trabajador activo · mínimo UF 5» o «UF 20 al mes». */
export function textoPrecioLista(p: PrecioLista): string {
  const base =
    p.forma === "por_unidad" && p.unidad
      ? `${monto(p.precio, p.moneda)} por ${UNIDADES_COBRO[p.unidad].singular}`
      : `${monto(p.precio, p.moneda)} al mes`;
  return p.minimoMensual ? `${base} · mínimo ${monto(p.minimoMensual, p.moneda)}` : base;
}

/** «Trabajador activo»: la unidad con mayúscula inicial, para selectores y listas. */
export const etiquetaUnidad = (u: UnidadCobro) => {
  const s = UNIDADES_COBRO[u].singular;
  return s.charAt(0).toUpperCase() + s.slice(1);
};
