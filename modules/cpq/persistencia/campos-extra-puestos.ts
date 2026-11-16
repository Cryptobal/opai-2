import {
  htmlResumenEconomico,
  htmlTablaServicio,
  soloAutorizados,
  valoresPuesto,
  type FilaPuestoCotizacion,
  type ValorCampo,
} from "@opai/domain";
import { IVA_PCT } from "@opai/domain/dinero";

import { totalesDocumento } from "../domain/documento/totales";
import type { EntradaPdfCotizacion } from "./documento-pdf-tipos";
import { servicioDesdeFilas } from "./propuesta-tecnica";
import { packServicioCotizacion, type PackFilasCotizacion } from "./recalcular";

function ventaPorLinea(entrada: EntradaPdfCotizacion | null): Map<string, number | null> {
  const m = new Map<string, number | null>();
  for (const s of entrada?.secciones ?? []) {
    for (const l of s.lineas) m.set(`${s.nombre}\0${l.nombre}`, l.ventaMensualClp ?? null);
  }
  return m;
}

export function filasPuestosCotizacion(
  pack: PackFilasCotizacion | null,
  entrada: EntradaPdfCotizacion | null,
): FilaPuestoCotizacion[] {
  const ventas = ventaPorLinea(entrada);
  const puestos: FilaPuestoCotizacion[] = [];
  const servicio = pack ? servicioDesdeFilas(packServicioCotizacion(pack.cot, pack)) : null;
  for (const s of servicio?.secciones ?? []) {
    for (const p of s.puestos) {
      puestos.push({
        nombre: p.nombre,
        posiciones: p.posiciones,
        patron: p.patron,
        horaInicio: p.horaInicio,
        horaFin: p.horaFin,
        diasCobertura: p.diasCobertura,
        ventaMensualClp: ventas.get(`${s.nombre}\0${p.nombre}`) ?? null,
        seccion: s.nombre,
      });
    }
  }
  return puestos;
}

export function bloquesHtmlCotizacion(
  permitidas: ReadonlySet<string>,
  puestos: FilaPuestoCotizacion[],
  venta: number | null,
  meses: number | null,
  tasaIva: number | null,
): Record<string, ValorCampo> {
  const extra: Record<string, ValorCampo> = {};
  const tot = venta != null ? totalesDocumento(venta, tasaIva ?? IVA_PCT, 0) : null;
  if (permitidas.has("bloque.tabla_servicio") || permitidas.has("tabla_servicio")) {
    extra["bloque.tabla_servicio"] = htmlTablaServicio(puestos);
  }
  if (permitidas.has("bloque.resumen_economico") || permitidas.has("resumen_economico")) {
    extra["bloque.resumen_economico"] = htmlResumenEconomico({
      netoMensualClp: venta,
      ivaClp: tot?.ivaClp ?? null,
      totalMensualClp: tot?.totalClp ?? null,
      mesesContrato: meses,
    });
  }
  return extra;
}

export function serializarCampos(reg: Record<string, ValorCampo>): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(reg).map(([k, x]) => [k, x instanceof Date ? x.toISOString().slice(0, 10) : (x ?? null)]),
  );
}

export function puestosSerializados(
  puestos: FilaPuestoCotizacion[],
  permitidas: ReadonlySet<string>,
): Record<string, string | number | boolean | null>[] {
  return puestos.map((p) => serializarCampos(soloAutorizados(valoresPuesto(p), permitidas)));
}