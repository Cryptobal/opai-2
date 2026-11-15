// Texto de las plantillas laborales (CAR-127 · 06 Editor). Reglas puras, sin Next, React ni base: el
// editor las usa para la vista previa y el generador (PR 4) para armar el PDF con el mismo criterio.
// Formato (decisión 2 de Carlos, 9-nov-2026: texto con variables): párrafos separados por una línea en
// blanco, `**negrita**`, `*cursiva*` y variables `{grupo.clave}` del catálogo.

import { ambitoDeClase, gruposDeAmbito } from "./documento-plantillas-ambito";
import {
  VARIABLES_PLANTILLA,
  type ClasePlantilla,
  type GrupoVariable,
  type VariablePlantilla,
} from "./documento-plantillas";

/** Quién firma la plantilla (diseño 06): con «ambos», primero el trabajador y después el empleador. */
export const FIRMANTES_PLANTILLA = ["empleador", "trabajador", "ambos"] as const;
export type FirmantesPlantilla = (typeof FIRMANTES_PLANTILLA)[number];

export const ETIQUETA_FIRMANTES: Readonly<Record<FirmantesPlantilla, string>> = {
  empleador: "Empleador",
  trabajador: "Trabajador",
  ambos: "Ambos",
};

export const ETIQUETA_GRUPO_VARIABLE: Readonly<Record<GrupoVariable, string>> = {
  persona: "Persona",
  vinculo: "Vínculo",
  instalacion: "Instalación",
  cuenta: "Cuenta",
  sueldo: "Sueldo",
  contrato: "Contrato",
};

export type SegmentoPlantilla =
  | { tipo: "texto"; texto: string; negrita: boolean; cursiva: boolean }
  | { tipo: "variable"; clave: string; conocida: boolean; negrita: boolean; cursiva: boolean };

const CLAVES = new Set(VARIABLES_PLANTILLA.map((v) => v.clave));
const ENFASIS = /(\*\*[^*]+?\*\*|\*[^*\n]+?\*)/;
const VARIABLE = /\{([a-z]+\.[a-z_]+)\}/;

function variablesYTexto(texto: string, negrita: boolean, cursiva: boolean): SegmentoPlantilla[] {
  // `split` con un grupo de captura intercala texto (pares) y claves (impares).
  return texto.split(VARIABLE).flatMap((parte, i): SegmentoPlantilla[] => {
    if (i % 2 === 1)
      return [{ tipo: "variable", clave: parte, conocida: CLAVES.has(parte), negrita, cursiva }];
    return parte ? [{ tipo: "texto", texto: parte, negrita, cursiva }] : [];
  });
}

/** Segmentos de un párrafo: énfasis de un nivel (`**…**` o `*…*`) y variables adentro. */
export function segmentosDeParrafo(parrafo: string): SegmentoPlantilla[] {
  return parrafo.split(ENFASIS).flatMap((parte, i) => {
    if (i % 2 === 0) return variablesYTexto(parte, false, false);
    const negrita = parte.startsWith("**");
    const interior = negrita ? parte.slice(2, -2) : parte.slice(1, -1);
    return variablesYTexto(interior, negrita, !negrita);
  });
}

/** Párrafos (separados por una línea en blanco) ya segmentados. Los saltos simples se conservan. */
export function parrafosDePlantilla(texto: string): SegmentoPlantilla[][] {
  return texto
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(segmentosDeParrafo);
}

const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** Variables del catálogo agrupadas para el panel, filtradas por clave o etiqueta (sin tildes). */
export function gruposDeVariables(
  busqueda = "",
  clase?: ClasePlantilla,
): { grupo: GrupoVariable; titulo: string; variables: VariablePlantilla[] }[] {
  const q = normal(busqueda);
  const grupos = Object.keys(ETIQUETA_GRUPO_VARIABLE) as GrupoVariable[];
  return grupos
    .map((grupo) => ({
      grupo,
      titulo: ETIQUETA_GRUPO_VARIABLE[grupo],
      variables: VARIABLES_PLANTILLA.filter(
        (v) =>
          v.grupo === grupo &&
          (!clase || gruposDeAmbito(ambitoDeClase(clase)).includes(grupo)) &&
          (!q || normal(v.clave).includes(q) || normal(v.etiqueta).includes(q)),
      ),
    }))
    .filter((g) => g.variables.length > 0);
}

/** Reemplaza el rango [inicio, fin) por `insercion` y devuelve el texto y el cursor tras lo insertado. */
export function insertarEnTexto(texto: string, inicio: number, fin: number, insercion: string) {
  const a = Math.max(0, Math.min(inicio, texto.length));
  const b = Math.max(a, Math.min(fin, texto.length));
  return { texto: texto.slice(0, a) + insercion + texto.slice(b), cursor: a + insercion.length };
}

/** Envuelve la selección con la marca de énfasis (`**` o `*`) y deja seleccionado el interior. */
export function envolverSeleccion(texto: string, inicio: number, fin: number, marca: "**" | "*") {
  const a = Math.max(0, Math.min(inicio, texto.length));
  const b = Math.max(a, Math.min(fin, texto.length));
  const interior = texto.slice(a, b) || (marca === "**" ? "negrita" : "cursiva");
  return {
    texto: texto.slice(0, a) + marca + interior + marca + texto.slice(b),
    inicio: a + marca.length,
    fin: a + marca.length + interior.length,
  };
}
