/**
 * Formateador único de presentación (R4, CAR-153). Pantallas, PDFs y correos usan estas funciones;
 * nadie más llama a `Intl.NumberFormat` ni a `toLocaleString("es-CL")`.
 * Espacio duro (U+00A0) entre el símbolo y la cifra para que el monto nunca se corte al envolver.
 */
import { PCT_ESCALA, UF_ESCALA } from "./dinero";

const NBSP = " ";
const ZONA = "America/Santiago";

function miles(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** `n` con `dec` decimales, miles con punto y coma decimal. Redondea mitad hacia arriba en valor absoluto. */
function numeroEs(n: number, dec: number): string {
  if (!Number.isFinite(n)) throw new RangeError(`Número inválido: ${n}`);
  const escala = 10 ** dec;
  const redondeado = Math.round(Math.abs(n) * escala + 1e-9) / escala;
  const [ent = "0", fr = ""] = redondeado.toFixed(dec).split(".");
  return fr ? `${miles(ent)},${fr}` : miles(ent);
}

function esCero(cuerpo: string): boolean {
  return /^0(,0*)?$/.test(cuerpo);
}

/** `$ 1.234.567` (con espacio duro); negativos `-$ 12.300`. Sin decimales. */
export function formatearClp(monto: number): string {
  const cuerpo = numeroEs(monto, 0);
  return `${monto < 0 && !esCero(cuerpo) ? "-" : ""}$${NBSP}${cuerpo}`;
}

/** `UF 12,50` desde un entero escalado (`UF_ESCALA`). Hasta 4 decimales, mínimo `min` (2 por defecto). */
export function formatearUf(ufEscalada: number, min = 2): string {
  const [ent = "0", fr = ""] = numeroEs(ufEscalada / UF_ESCALA, 4).split(",");
  const dec = fr.replace(/0+$/, "").padEnd(min, "0");
  const cuerpo = dec ? `${ent},${dec}` : ent;
  return `${ufEscalada < 0 && !esCero(cuerpo) ? "-" : ""}UF${NBSP}${cuerpo}`;
}

/** `19,0 %` desde un entero escalado (`PCT_ESCALA`: 100 % = 1.000.000). */
export function formatearPorcentaje(pctEscalado: number, decimales = 1): string {
  const cuerpo = numeroEs((pctEscalado / PCT_ESCALA) * 100, decimales);
  return `${pctEscalado < 0 && !esCero(cuerpo) ? "-" : ""}${cuerpo}${NBSP}%`;
}

/** Número con miles y coma decimal (`1.234,5`). Para cantidades y tokens; no para dinero en CLP. */
export function formatearNumero(n: number, maxDecimales = 0, minDecimales = 0): string {
  const [ent = "0", fr = ""] = numeroEs(n, maxDecimales).split(",");
  const dec = fr.replace(/0+$/, "").padEnd(minDecimales, "0");
  const cuerpo = dec ? `${ent},${dec}` : ent;
  return `${n < 0 && !esCero(cuerpo) ? "-" : ""}${cuerpo}`;
}

/** `US$ 12,34` (dólares de consumo de proveedores, no dinero del tenant). */
export function formatearUsd(n: number, decimales = 2): string {
  return `US$${NBSP}${formatearNumero(n, decimales, decimales)}`;
}

function aFecha(valor: string | Date): Date {
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) throw new RangeError(`Fecha inválida: ${String(valor)}`);
  return d;
}

/** `dd-mm-aaaa` en la zona del tenant. Una fecha `aaaa-mm-dd` se presenta sin correr el día. */
export function formatearFecha(valor: string | Date | null | undefined, zona = ZONA): string {
  if (!valor) return "—";
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-");
    return `${d}-${m}-${a}`;
  }
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: zona,
  })
    .format(aFecha(valor))
    .replace(/\//g, "-");
}

/** `dd-mm-aaaa HH:mm` (24 h) en la zona del tenant. */
export function formatearFechaHora(valor: string | Date | null | undefined, zona = ZONA): string {
  if (!valor) return "—";
  const hora = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: zona,
  }).format(aFecha(valor));
  return `${formatearFecha(valor, zona)} ${hora}`;
}
