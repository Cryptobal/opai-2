// CAF (Código de Autorización de Folios) · lectura y reglas puras (Facturación PR 3).

import { normalizarRut } from "../rut";
import { cafVencido, type TipoDteVenta } from "./ventas";

/** Tipos de DTE que admiten carga de CAF en ventas/folios. */
export const TIPOS_DTE_CAF = [33, 34, 56, 61] as const;
export type TipoDteCaf = (typeof TIPOS_DTE_CAF)[number];

/** Slug del tenant QA de Finanzas («Vigía Austral SpA»): solo CAF sintéticos. */
export const SLUG_TENANT_QA_FINANZAS = "vigia-austral";

/** RUT emisor de prueba aceptados en certificación / fixtures (sin datos reales de clientes). */
export const RUTS_CAF_SINTETICO = new Set(["55555555-5", "66666666-6", "76111222-8", "77234567-8"]);

export type CafLectura = {
  rutEmisor: string;
  tipoDte: TipoDteCaf;
  folioDesde: number;
  folioHasta: number;
  autorizadoEn: string;
  idk: string | null;
  venceEn: string | null;
};

export type ValidarCafInput = {
  xml: string;
  rutEmisorEsperado: string;
  hoyIso: string;
  /** Todos los rangos ya cargados del tenant (activos, inactivos o agotados). */
  rangosCargados: readonly { folioDesde: number; folioHasta: number }[];
};

function etiqueta(tag: string, xml: string): string | null {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1]?.trim() ?? null;
}

function entero(tag: string, xml: string): number | null {
  const t = etiqueta(tag, xml);
  if (t == null || !/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}

/** Lee el XML del CAF (estructura SII habitual) sin dependencias externas. */
export function leerCafXml(xml: string): CafLectura | null {
  const crudo = xml.trim();
  if (!crudo.includes("<CAF") || !crudo.includes("<DA")) return null;
  const rutRaw = etiqueta("RE", crudo);
  const rutEmisor = rutRaw ? normalizarRut(rutRaw) : null;
  const td = entero("TD", crudo);
  const folioDesde = entero("D", crudo);
  const folioHasta = entero("H", crudo);
  const fa = etiqueta("FA", crudo);
  const idk = etiqueta("IDK", crudo);
  if (!rutEmisor || td == null || folioDesde == null || folioHasta == null || !fa) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fa) || Number.isNaN(Date.parse(`${fa}T00:00:00Z`))) return null;
  if (!(TIPOS_DTE_CAF as readonly number[]).includes(td)) return null;
  if (folioHasta < folioDesde) return null;
  const tipoDte = td as TipoDteCaf;
  return {
    rutEmisor,
    tipoDte,
    folioDesde,
    folioHasta,
    autorizadoEn: fa,
    idk: idk ?? null,
    venceEn: vencimientoCafDesdeFa(fa, tipoDte),
  };
}

/** FA + 6 meses calendario para 33/56/61; tipo 34 sin vencimiento. */
export function vencimientoCafDesdeFa(faIso: string, tipoDte: number): string | null {
  if (tipoDte === 34) return null;
  if (![33, 56, 61].includes(tipoDte)) return null;
  const partes = faIso.split("-").map(Number);
  if (partes.length !== 3 || partes.some((n) => Number.isNaN(n))) return null;
  const y = partes[0]!;
  const m = partes[1]!;
  const d = partes[2]!;
  let mes = m + 6;
  let anio = y;
  while (mes > 12) {
    mes -= 12;
    anio += 1;
  }
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const dia = Math.min(d, ultimoDia);
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function rangosCafSeSolapan(
  aDesde: number,
  aHasta: number,
  bDesde: number,
  bHasta: number,
): boolean {
  return aDesde <= bHasta && bDesde <= aHasta;
}

export function esCafMarcadoSintetico(lectura: CafLectura): boolean {
  if (lectura.idk?.toUpperCase().includes("SINTETICO")) return true;
  if (lectura.idk?.toUpperCase().startsWith("CERT")) return true;
  return RUTS_CAF_SINTETICO.has(lectura.rutEmisor);
}

export function requiereCafSintetico(slugTenant: string): boolean {
  return slugTenant === SLUG_TENANT_QA_FINANZAS;
}

/** Próximo folio al cargar CAF, respetando el último consumido en OPAI 1.0 si se conoce. */
export function folioActualInicialCaf(folioDesde: number, ultimoFolioOpai1: number | null | undefined): number {
  if (ultimoFolioOpai1 == null) return folioDesde;
  return Math.max(folioDesde, ultimoFolioOpai1 + 1);
}

export type ErrorCaf = "xml_invalido" | "rut_distinto" | "tipo_no_habilitado" | "solape" | "vencido" | "no_sintetico";

export function validarCaf(input: ValidarCafInput): { ok: true; lectura: CafLectura } | { ok: false; error: ErrorCaf } {
  const lectura = leerCafXml(input.xml);
  if (!lectura) return { ok: false, error: "xml_invalido" };
  if (lectura.rutEmisor !== normalizarRut(input.rutEmisorEsperado)) return { ok: false, error: "rut_distinto" };
  if (!(TIPOS_DTE_CAF as readonly number[]).includes(lectura.tipoDte)) {
    return { ok: false, error: "tipo_no_habilitado" };
  }
  for (const r of input.rangosCargados) {
    if (rangosCafSeSolapan(lectura.folioDesde, lectura.folioHasta, r.folioDesde, r.folioHasta)) {
      return { ok: false, error: "solape" };
    }
  }
  if (cafVencido(lectura.venceEn, input.hoyIso)) return { ok: false, error: "vencido" };
  return { ok: true, lectura };
}

export function formatearFechaCaf(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

export function formatearLecturaCaf(lectura: CafLectura, rutCoincide = true): string {
  const vence =
    lectura.venceEn == null ? "sin vencimiento" : `vence ${formatearFechaCaf(lectura.venceEn)}`;
  const rut = rutCoincide ? "RUT coincide" : "RUT no coincide";
  return `CAF ${lectura.tipoDte} · ${lectura.folioDesde}–${lectura.folioHasta} · autorizado ${formatearFechaCaf(lectura.autorizadoEn)} · ${vence} · ${rut}`;
}

export function mensajeAvisoFoliosSinUsarPorVencer(total: number): string | null {
  if (total < 1) return null;
  return `${total} folio${total === 1 ? "" : "s"} vencerán sin usar: anúlalos en el SII`;
}

/** Tipos de venta emitibles hoy (61 incluido; 56 solo folio/CAF). */
export function tipoDteCafEsVenta(tipo: TipoDteCaf): tipo is TipoDteVenta {
  return tipo === 33 || tipo === 34 || tipo === 61;
}
