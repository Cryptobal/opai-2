/**
 * `{{secciones}}` de la plantilla HTML de la propuesta (CAR-575): las secciones activas del armador, en orden, con su
 * título y su texto, el índice y los capítulos por instalación. Una sección activa sin nada que decir se omite.
 */
import { NOMBRES_BLOQUE_PROPUESTA } from "@opai/domain";

import type { CapituloVista } from "./capitulo-instalacion";
import { armarIndice, type ItemIndice } from "./indice-propuesta";
import {
  type DatosResumen,
  htmlCapitulo,
  htmlResumenPropuesta,
  escaparDato,
  htmlServicio,
  parrafo,
  parrafos,
  parrafosConMarcadores,
  titulo,
} from "./html-fragmentos";
import type { BloqueArmadorPropuesta, ServicioDesdeCotizacion } from "./propuesta-tecnica";

/** Bloques que solo ordenan el documento: la portada la pone la plantilla y el índice lo arma `{{secciones}}`. */
const ESTRUCTURALES = new Set(["portada", "indice", "salto_pagina"]);

export type DatosSecciones = {
  bloques: readonly BloqueArmadorPropuesta[];
  /** Texto de la biblioteca por `bibliotecaClave`, ya en la versión que corresponde. */
  textosBiblioteca: Readonly<Record<string, string>>;
  servicio: ServicioDesdeCotizacion;
  capitulos: readonly CapituloVista[];
  resumen: DatosResumen;
  ejecutivo: string | null;
  empresa: string;
  /** Condiciones de la cotización o de la marca, cuando el bloque no trae texto propio. */
  condiciones: string;
  borrador: boolean;
};

type Seccion = { titulo: string; cuerpo: string; subtitulos: readonly string[] };

const texto = (b: BloqueArmadorPropuesta, d: DatosSecciones) =>
  (b.contenidoOverride ?? (b.bibliotecaClave ? d.textosBiblioteca[b.bibliotecaClave] : null) ?? "").trim();

/** El cuerpo de una sección; `null` si no hay nada que mostrar. `numero` es el de la sección en el documento. */
function cuerpoDe(b: BloqueArmadorPropuesta, d: DatosSecciones, numero: number): string | null {
  switch (b.tipo) {
    case "detalle_servicio": {
      const cuerpo = htmlServicio(d.servicio) + d.capitulos.map((c, k) => htmlCapitulo(c, `${numero}.${k + 1}`, d.borrador)).join("");
      return cuerpo || null;
    }
    case "resumen_economico":
      return htmlResumenPropuesta(d.resumen);
    case "contacto_ejecutivo":
      return d.ejecutivo ? parrafo(d.ejecutivo) + (d.empresa ? parrafo(d.empresa) : "") : null;
    case "condiciones":
      return parrafosConMarcadores(texto(b, d)) || parrafos(d.condiciones) || null;
    default:
      return parrafosConMarcadores(texto(b, d)) || null;
  }
}

function seccionesConContenido(d: DatosSecciones): Seccion[] {
  const salida: Seccion[] = [];
  for (const b of d.bloques.filter((x) => x.activo && !ESTRUCTURALES.has(x.tipo))) {
    const cuerpo = cuerpoDe(b, d, salida.length + 1);
    if (!cuerpo) continue;
    const nombre = b.titulo?.trim() || NOMBRES_BLOQUE_PROPUESTA[b.tipo] || "Información adicional";
    salida.push({ titulo: nombre, cuerpo, subtitulos: b.tipo === "detalle_servicio" ? d.capitulos.map((c) => c.nombre) : [] });
  }
  return salida;
}

/**
 * El HTML que reemplaza a `{{secciones}}`. La numeración sigue el orden de las secciones que sí salen, y los capítulos
 * («2.1») llevan el número de su sección, igual que el índice.
 */
export function htmlSecciones(d: DatosSecciones): string {
  const secciones = seccionesConContenido(d);
  const items: ItemIndice[] = secciones.map((s) => ({ titulo: s.titulo, subtitulos: s.subtitulos }));
  const indice = d.bloques.some((b) => b.activo && b.tipo === "indice") && items.length
    ? titulo(2, "Índice") + `<ul>${armarIndice(items).map((e) => `<li>${e.numero}. ${escaparDato(e.titulo)}</li>`).join("")}</ul>`
    : "";
  return indice + secciones.map((s, i) => titulo(2, `${i + 1}. ${s.titulo}`) + s.cuerpo).join("");
}

const MARCADOR = /\{\{\s*(?:bloque\.)?secciones\s*\}\}/i;

/** Inserta las secciones donde la plantilla trae `{{secciones}}`; sin marcador, al final. */
export const conSecciones = (html: string, secciones: string): string =>
  MARCADOR.test(html) ? html.replace(MARCADOR, () => secciones) : html + secciones;
