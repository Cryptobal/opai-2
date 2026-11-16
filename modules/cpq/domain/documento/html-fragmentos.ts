/** Fragmentos HTML de la propuesta técnica (CAR-575). Todo texto se escapa; solo salen elementos de la lista blanca del saneador. */
import { escaparHtml, formatearClp } from "@opai/domain";

import { formatearPersonas, type CapituloVista } from "./capitulo-instalacion";
import { proyectarResumenEconomico, type AperturaPropuesta, type ServicioDesdeCotizacion } from "./propuesta-tecnica";
import { etiquetaIva, repartirSeccionesComunes } from "./totales";

/** Escapa un dato de la cotización o de la marca y separa las llaves dobles: un dato nunca se lee como marcador `{{…}}`. */
export const escaparDato = (texto: string) => escaparHtml(texto).replace(/([{}])(?=[{}])/g, "$1 ");

export const titulo = (nivel: number, texto: string) => `<h${nivel}>${escaparDato(texto)}</h${nivel}>`;
export const parrafo = (texto: string) => `<p>${escaparDato(texto)}</p>`;

const lineas = (texto: string) =>
  texto
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

/** Un párrafo por línea de un dato (texto literal). */
export const parrafos = (texto: string) => lineas(texto).map(parrafo).join("");

/** Un párrafo por línea del texto de una sección: sus marcadores `{{…}}` se resuelven después, con los datos reales. */
export const parrafosConMarcadores = (texto: string) =>
  lineas(texto)
    .map((l) => `<p>${escaparHtml(l)}</p>`)
    .join("");

function tabla(cabeza: readonly string[], filas: readonly (readonly string[])[]): string {
  const celda = (tag: string) => (c: string) => `<${tag}>${escaparDato(c)}</${tag}>`;
  const cuerpo = filas.map((f) => `<tr>${f.map(celda("td")).join("")}</tr>`).join("");
  return `<table><thead><tr>${cabeza.map(celda("th")).join("")}</tr></thead><tbody>${cuerpo}</tbody></table>`;
}

const DIAS = (n: number | null) =>
  n === 7 ? "Lunes a domingo" : n === 5 ? "Lunes a viernes" : n != null ? `${n} días` : "";

export function htmlServicio(servicio: ServicioDesdeCotizacion): string {
  return servicio.secciones
    .filter((s) => s.puestos.length)
    .map((s) =>
      titulo(3, s.nombre) +
      tabla(
        ["Puesto", "Dotación", "Turno y cobertura"],
        s.puestos.map((p) => [
          p.nombre,
          `×${p.posiciones}`,
          [p.patron, p.horaInicio && p.horaFin ? `${p.horaInicio}–${p.horaFin}` : null, DIAS(p.diasCobertura)]
            .filter(Boolean)
            .join(" · "),
        ]),
      ),
    )
    .join("");
}

const persona = (n: number | null) => (n == null ? "—" : formatearPersonas(n));

/** Capítulo de una instalación: lo derivado del CPQ y los textos guardados; lo que falta solo se avisa en borrador. */
export function htmlCapitulo(c: CapituloVista, numero: string, borrador: boolean): string {
  const puestos = c.puestos.length
    ? tabla(
        ["Puesto", "Guardias simultáneos", "Dotación estimada", "Turno"],
        [
          ...c.puestos.map((p) => [p.nombre, String(p.guardiasSimultaneos), persona(p.dotacion), p.turno]),
          ["Total", String(c.totales.guardiasSimultaneos), persona(c.totales.dotacion), ""],
        ],
      ) + parrafo("La dotación estimada resulta de la cobertura semanal del turno sobre la jornada media del patrón.")
    : "";
  const faltantes =
    borrador && c.faltantes.length
      ? parrafo(`Pendiente por completar (solo borrador): ${c.faltantes.map((f) => f.titulo).join("; ")}.`)
      : "";
  return [
    titulo(3, `${numero}. ${c.nombre}`),
    c.direccion ? parrafo(c.direccion) : "",
    c.mapaUrl ? parrafo(`Mapa: ${c.mapaUrl}`) : "",
    puestos,
    ...c.secciones.map((s) => titulo(4, s.titulo) + parrafos(s.texto)),
    faltantes,
  ].join("");
}

export type DatosResumen = {
  apertura: AperturaPropuesta;
  secciones: readonly { nombre: string; tienePuestos: boolean; netoMensualClp: number }[];
  netoTotalClp: number;
  gastosGeneralesYUtilidadClp?: number | null;
  tasaIvaPct?: number;
};

export function htmlResumenPropuesta(d: DatosResumen): string {
  const r = proyectarResumenEconomico({
    apertura: d.apertura,
    secciones: repartirSeccionesComunes(d.secciones),
    netoTotalClp: d.netoTotalClp,
    ...(d.gastosGeneralesYUtilidadClp !== undefined ? { gastosGeneralesYUtilidadClp: d.gastosGeneralesYUtilidadClp } : {}),
    ...(d.tasaIvaPct !== undefined ? { tasaIvaPct: d.tasaIvaPct } : {}),
  });
  const porInstalacion =
    r.lineas.length && r.lineas.reduce((a, l) => a + l.netoMensualClp, 0) === d.netoTotalClp
      ? tabla(["Instalación", "Neto mensual"], r.lineas.map((l) => [l.instalacion, formatearClp(l.netoMensualClp)]))
      : "";
  const totales: string[][] = [["Neto mensual", formatearClp(r.netoTotalClp)]];
  if (r.gastosGeneralesYUtilidadClp != null)
    totales.push(["Gastos generales y utilidad", formatearClp(r.gastosGeneralesYUtilidadClp)]);
  totales.push([etiquetaIva(d.tasaIvaPct ?? 190_000), formatearClp(r.ivaClp)], ["Total mensual", formatearClp(r.totalClp)]);
  return porInstalacion + tabla(["Concepto", "Monto"], totales);
}
