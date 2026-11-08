// Tokens del catálogo único en los textos de la propuesta técnica (CAR-138, PR 3). Puro: valida contra
// la finalidad «propuesta», arma el contrato que se congela al enviar y aplica los valores congelados.
import {
  VERSION_CATALOGO_CAMPOS,
  renderizarPlantillaCampos,
  validarPlantillaCampos,
  type ProblemaCampo,
} from "@opai/domain";

import { parseBloquesArmadorPropuesta } from "./propuesta-tecnica-parse";
import type { ContratoCamposEnvio } from "./propuesta-tecnica-tipos";

type Valores = ContratoCamposEnvio["valores"];

/** Textos de la propuesta que pueden llevar tokens: ediciones manuales y bloques de biblioteca. */
export function textosConTokens(
  bloquesJson: string,
  textosBiblioteca: Readonly<Record<string, string>>,
): string[] {
  const manuales = parseBloquesArmadorPropuesta(bloquesJson)
    .map((b) => b.contenidoOverride?.trim())
    .filter((t): t is string => Boolean(t));
  return [...manuales, ...Object.values(textosBiblioteca)];
}

export type ValidacionTextos = {
  problemas: ProblemaCampo[];
  usados: string[];
  colecciones: string[];
};

/** Valida todos los textos con la finalidad «propuesta»: tokens desconocidos, no autorizados o mal cerrados. */
export function validarTextosPropuesta(textos: readonly string[]): ValidacionTextos {
  const problemas: ProblemaCampo[] = [];
  const usados = new Set<string>();
  const colecciones = new Set<string>();
  for (const t of textos) {
    const r = validarPlantillaCampos(t, "propuesta");
    problemas.push(...r.problemas);
    r.usados.forEach((u) => usados.add(u));
    r.colecciones.forEach((c) => colecciones.add(c));
  }
  return { problemas, usados: [...usados], colecciones: [...colecciones] };
}

/** Arma el contrato a congelar; los faltantes de cualquier texto se informan sin repetir. */
export function contratoCamposDeEnvio(
  textos: readonly string[],
  usados: readonly string[],
  valores: Valores,
): ContratoCamposEnvio {
  const faltantes = new Set<string>();
  for (const t of textos) {
    const r = renderizarPlantillaCampos(t, valores, { finalidad: "propuesta" });
    if (r.ok) r.faltantes.forEach((f) => faltantes.add(f));
  }
  return {
    versionCatalogo: VERSION_CATALOGO_CAMPOS,
    finalidad: "propuesta",
    usados: [...usados],
    valores,
    faltantes: [...faltantes],
  };
}

/** Aplica los valores congelados a un texto. Sin contrato, o si algo no valida, devuelve el texto tal cual. */
export function aplicarContratoATexto(
  texto: string,
  contrato: ContratoCamposEnvio | undefined,
): string {
  if (!contrato) return texto;
  const r = renderizarPlantillaCampos(texto, contrato.valores, { finalidad: "propuesta" });
  return r.ok ? r.texto : texto;
}

/** Aplica el contrato a las ediciones manuales dentro del JSON de bloques del armador. */
export function aplicarContratoABloques(
  bloquesJson: string,
  contrato: ContratoCamposEnvio | undefined,
): string {
  if (!contrato) return bloquesJson;
  const bloques = parseBloquesArmadorPropuesta(bloquesJson).map((b) =>
    b.contenidoOverride
      ? { ...b, contenidoOverride: aplicarContratoATexto(b.contenidoOverride, contrato) }
      : b,
  );
  return JSON.stringify(bloques);
}

export function textosBibliotecaConContrato(
  textos: Readonly<Record<string, string>>,
  contrato: ContratoCamposEnvio | undefined,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(textos).map(([k, v]) => [k, aplicarContratoATexto(v, contrato)]),
  );
}
