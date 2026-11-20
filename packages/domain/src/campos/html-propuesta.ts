import { escaparHtml } from "../plantillas";
import { formatearClp } from "../formato";

import type { FilaPuestoCotizacion } from "./mapeo-puesto";
import { textoTurnoPuesto } from "./mapeo-puesto";

const celda = (s: string) => `<td style="padding:6px 8px;border:1px solid #ddd">${escaparHtml(s)}</td>`;
const th = (s: string) => `<th style="padding:6px 8px;border:1px solid #ddd;text-align:left">${escaparHtml(s)}</th>`;

export function htmlTablaServicio(puestos: readonly FilaPuestoCotizacion[]): string {
  if (!puestos.length) return "";
  const filas = puestos.map((p) => {
    const precio = p.ventaMensualClp == null ? "—" : formatearClp(p.ventaMensualClp);
    return `<tr>${celda(p.nombre)}${celda(`×${p.posiciones}`)}${celda(textoTurnoPuesto(p) || "—")}${celda(precio)}</tr>`;
  });
  return [
    '<table style="width:100%;border-collapse:collapse;font-size:14px">',
    `<thead><tr>${th("Puesto")}${th("Dotación")}${th("Turno y cobertura")}${th("Precio mensual")}</tr></thead>`,
    `<tbody>${filas.join("")}</tbody></table>`,
  ].join("");
}

export function htmlResumenEconomico(input: {
  netoMensualClp: number | null;
  ivaClp: number | null;
  totalMensualClp: number | null;
  mesesContrato: number | null;
}): string {
  const m = (v: number | null) => (v == null ? "—" : formatearClp(v));
  const filas: [string, string][] = [
    ["Neto mensual", m(input.netoMensualClp)],
    ["IVA", m(input.ivaClp)],
    ["Total mensual", m(input.totalMensualClp)],
    ["Meses de contrato", input.mesesContrato == null ? "—" : String(input.mesesContrato)],
  ];
  const body = filas.map((f) => `<tr>${celda(f[0])}${celda(f[1])}</tr>`).join("");
  return `<table style="width:100%;max-width:420px;border-collapse:collapse;font-size:14px"><tbody>${body}</tbody></table>`;
}