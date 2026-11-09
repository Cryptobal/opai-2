/**
 * Prompt exportable de la propuesta técnica (CAR-138, PR 8). Dominio puro: arma el texto que se le entrega a
 * Claude Design u otra IA a partir del catálogo real de campos (`packages/domain/src/campos`). No hay lista
 * de campos escrita a mano: cada clave, alias, tipo, formato y ejemplo sale de `CampoDef`.
 *
 * Solo promete texto con marcadores. No promete archivos Figma, PPT ni PDF, ni importación de HTML.
 */
import {
  FORMATOS_POR_TIPO,
  VERSION_CATALOGO_CAMPOS,
  renderizarPlantillaCampos,
  validarPlantillaCampos,
  entidadDeCampo,
  type CampoDef,
  type ColeccionDef,
} from "@opai/domain";

export type EntradaPrompt = {
  /** Campos que la propuesta puede resolver hoy para quien consulta. */
  disponibles: readonly CampoDef[];
  /** Campos de la finalidad sin valores todavía: se nombran para que la IA no los use. */
  sinValores?: readonly CampoDef[];
  colecciones: readonly ColeccionDef[];
};

export type PromptExportable = {
  version: number;
  finalidad: "propuesta";
  texto: string;
  /** Claves canónicas que el prompt permite usar, en el orden del catálogo. */
  claves: string[];
};

const ENTIDADES: Readonly<Record<string, string>> = {
  empresa: "Empresa que propone",
  cuenta: "Cliente (cuenta)",
  contacto: "Contacto del cliente",
  persona: "Persona",
  instalacion: "Instalación",
  negocio: "Negocio",
  cotizacion: "Cotización (única fuente de precios y condiciones)",
};

const fila = (c: CampoDef) =>
  `| {{${c.clave}}} | ${c.tipo} (${FORMATOS_POR_TIPO[c.tipo].join(", ")}) | ${c.descripcion} | ${
    c.alias?.length ? c.alias.map((a) => `{{${a}}}`).join(", ") : "—"
  } | ${c.ejemplo} |`;

function tablaCampos(campos: readonly CampoDef[]): string[] {
  const out: string[] = [];
  const entidades = [...new Set(campos.map((c) => entidadDeCampo(c)))];
  for (const e of entidades) {
    out.push(`### ${ENTIDADES[e] ?? e}`, "", "| Marcador | Tipo (formatos) | Qué es | Alias | Ejemplo ficticio |", "|---|---|---|---|---|");
    out.push(...campos.filter((c) => entidadDeCampo(c) === e).map(fila), "");
  }
  return out;
}

/** Ejemplo de repetición armado solo con claves disponibles; se valida y se renderiza con los ejemplos del catálogo. */
function ejemploRepeticion(disp: readonly CampoDef[], col: ColeccionDef | undefined): string[] {
  const tiene = (k: string) => disp.find((c) => c.clave === k);
  const nombre = tiene("instalacion.nombre");
  if (!col || !nombre) return [];
  const dir = tiene("instalacion.direccion");
  const plantilla = `{{#cada ${col.clave}}}\n{{${nombre.clave}}}${
    dir ? `{{#si ${dir.clave}}} · {{${dir.clave}}}{{/si}}` : ""
  }\n{{/cada}}`;
  const valores = Object.fromEntries(disp.map((c) => [c.clave, c.ejemplo]));
  const r = renderizarPlantillaCampos(plantilla, { campos: {}, colecciones: { [col.clave]: [valores] } }, { finalidad: "propuesta" });
  if (!validarPlantillaCampos(plantilla, "propuesta").ok || !r.ok) return [];
  return ["## Ejemplo de repetición", "", "Plantilla:", "```", plantilla, "```", "Con datos ficticios queda:", "```", r.texto.trim(), "```", ""];
}

export function generarPromptPropuesta(e: EntradaPrompt): PromptExportable {
  const disp = e.disponibles;
  // La repetición solo se explica si hay marcadores de la entidad que se repite.
  const col = e.colecciones.find((c) => disp.some((d) => entidadDeCampo(d) === c.entidad));
  const lineas: string[] = [
    `# Prompt · Propuesta técnica OPAI (catálogo de campos v${VERSION_CATALOGO_CAMPOS})`,
    "",
    "Diseña el texto y la estructura de una propuesta técnica de servicios para una empresa de servicios intensivos en personal.",
    "Los datos que tienen marcador en este prompt NO se escriben: se dejan como marcadores `{{…}}` que OPAI reemplaza al generar el documento.",
    "",
    "## Reglas",
    "",
    "- Usa solo los marcadores de este prompt, tal como están escritos (minúsculas y guion bajo). Si un dato no tiene marcador, no lo escribas ni lo inventes.",
    "- Precios, vigencia y condiciones económicas no tienen marcador todavía: no los escribas, no los calcules y no dejes espacios para ellos. OPAI los incorpora desde la cotización por otra vía.",
    "- No inventes certificados, SLA, plazos, cantidades de personal ni nombres de personas.",
    "- Un marcador sin valor queda vacío y OPAI lo informa como faltante: no lo reemplaces por texto de relleno.",
    "- Los valores de ejemplo de este prompt son ficticios; no los copies al diseño final.",
    "",
    "## Sintaxis",
    "",
    "- Campo: `{{clave}}` o con formato `{{clave | formato}}`. Los formatos válidos dependen del tipo (columna «Tipo»).",
    ...(col ? [`- Repetición: \`{{#cada ${col.clave}}} … {{/cada}}\`: ${col.descripcion}. Dentro, los marcadores de ${col.entidad} toman cada elemento. No se anida un \`#cada\` dentro de otro.`] : []),
    "- Condición: `{{#si clave}} … {{/si}}` muestra el bloque solo si el campo tiene valor.",
    "- Todo bloque se cierra. Un marcador desconocido, mal cerrado o sin autorización invalida el texto completo.",
    "- Los alias de la tabla siguen funcionando, pero escribe siempre la clave principal.",
    "",
    "## Marcadores disponibles",
    "",
    ...tablaCampos(disp),
    ...ejemploRepeticion(disp, col),
  ];
  if (e.sinValores?.length) {
    lineas.push(
      "## Todavía sin valores (no los uses)",
      "",
      e.sinValores.map((c) => `\`${c.clave}\``).join(", "),
      "",
    );
  }
  lineas.push(
    "## Entrega",
    "",
    "Devuelve el diseño de la propuesta con los marcadores literales en su lugar. Este prompt no genera por sí solo archivos de otro formato ni los importa en OPAI.",
  );
  return { version: VERSION_CATALOGO_CAMPOS, finalidad: "propuesta", texto: lineas.join("\n"), claves: disp.map((c) => c.clave) };
}
