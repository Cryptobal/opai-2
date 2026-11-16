// Tokens del catálogo único en los textos de la propuesta técnica (CAR-138, PR 3). Puro: valida contra
// la finalidad «propuesta» y arma el contrato que se congela al enviar.
import {
  VERSION_CATALOGO_CAMPOS,
  renderizarPlantillaCampos,
  validarPlantillaCampos,
  type ProblemaCampo,
} from "@opai/domain";

import { parseBloquesArmadorPropuesta } from "./propuesta-tecnica-parse";
import type { ContratoCamposEnvio } from "./propuesta-tecnica-tipos";

type Valores = ContratoCamposEnvio["valores"];

/**
 * Textos que realmente salen en el PDF, con la misma selección que el renderer: solo bloques activos y
 * el texto manual manda sobre el de biblioteca. Un bloque apagado no bloquea ni congela nada.
 */
export function textosConTokens(
  bloquesJson: string,
  textosBiblioteca: Readonly<Record<string, string>>,
): string[] {
  return parseBloquesArmadorPropuesta(bloquesJson)
    .filter((b) => b.activo)
    .map(
      (b) =>
        b.contenidoOverride ??
        (b.bibliotecaClave ? textosBiblioteca[b.bibliotecaClave] : undefined),
    )
    .filter((t): t is string => typeof t === "string" && t.trim() !== "");
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

/**
 * Arma el contrato a congelar con lo mínimo: solo las claves que el texto usa (y cada colección solo si
 * hay una repetición de ella), para no guardar datos de clientes que no salen en el documento. Los
 * faltantes de cualquier texto se informan sin repetir.
 */
export function contratoCamposDeEnvio(
  textos: readonly string[],
  usados: readonly string[],
  colecciones: readonly string[],
  valores: Valores,
): ContratoCamposEnvio {
  const faltantes = new Set<string>();
  for (const t of textos) {
    const r = renderizarPlantillaCampos(t, valores, { finalidad: "propuesta" });
    if (r.ok) r.faltantes.forEach((f) => faltantes.add(f));
  }
  const usadas = new Set(usados);
  const solo = (m: Readonly<Record<string, string | number | boolean | null>>) =>
    Object.fromEntries(Object.entries(m).filter(([k]) => usadas.has(k)));
  return {
    versionCatalogo: VERSION_CATALOGO_CAMPOS,
    finalidad: "propuesta",
    usados: [...usados],
    valores: {
      campos: solo(valores.campos),
      colecciones: {
        instalaciones: colecciones.includes("instalaciones")
          ? valores.colecciones.instalaciones.map(solo)
          : [],
        referencias: colecciones.includes("referencias")
          ? (valores.colecciones.referencias ?? []).map(solo)
          : [],
        puestos: colecciones.includes("puestos") ? (valores.colecciones.puestos ?? []).map(solo) : [],
      },
    },
    faltantes: [...faltantes],
  };
}

/**
 * El historial de envíos no devuelve los valores resueltos: se resolvieron con los permisos y el alcance de
 * quien envió, no de quien lee. Conserva versión, claves usadas y faltantes.
 */
export function snapshotParaLectura(snapshotJson: string): string {
  try {
    const raw = JSON.parse(snapshotJson) as { camposContrato?: ContratoCamposEnvio };
    if (!raw.camposContrato) return snapshotJson;
    const { versionCatalogo, finalidad, usados, faltantes } = raw.camposContrato;
    const valores = { campos: {}, colecciones: { instalaciones: [], referencias: [], puestos: [] } };
    return JSON.stringify({
      ...raw,
      camposContrato: { versionCatalogo, finalidad, usados, valores, faltantes },
    });
  } catch {
    return snapshotJson;
  }
}
