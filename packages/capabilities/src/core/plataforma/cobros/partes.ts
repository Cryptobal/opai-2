import {
  dependenciaFaltante,
  entradaCatalogo,
  esIncluidoEnBase,
  esParteFinanzas,
  MODULO_FINANZAS,
  PARTES_FINANZAS,
  partesConPrecio,
} from "@opai/domain";

import { reglaDeNegocio } from "../../../errores";

/** Lo que necesita de las operaciones de una empresa (estructural, como `OpsCobro`). */
type Condiciones = { condicionesCobro(): Promise<readonly { moduloId: string }[]> };

/** Lo incluido en el plan base no tiene precio aparte (DECISIÓN CARLOS, 4-nov-2026). */
export function exigirCobrable(moduloId: string): void {
  if (esIncluidoEnBase(moduloId))
    throw reglaDeNegocio(
      `${entradaCatalogo(moduloId)?.nombre ?? moduloId} está incluido en el plan base: no tiene precio aparte.`,
    );
}

/**
 * Valida las partes de Finanzas antes de fijar un precio o abrir una prueba (ADR-072): la parte
 * necesita sus dependencias («Flujo de caja necesita Bancos»), no se mezcla Finanzas entero con
 * partes (se cobraría dos veces) y no se quita una parte de la que otra depende.
 * `quitar: true` valida la baja de la condición de `moduloId`.
 */
export async function validarPartes(e: Condiciones, moduloId: string, quitar = false) {
  const otros = (await e.condicionesCobro()).map((c) => c.moduloId).filter((x) => x !== moduloId);
  if (moduloId === MODULO_FINANZAS && !quitar && otros.some(esParteFinanzas))
    throw reglaDeNegocio(
      "Ya hay partes de Finanzas con precio: quítalas antes de cobrar Finanzas entero.",
    );
  if (!esParteFinanzas(moduloId)) return;
  if (quitar) {
    const sin = partesConPrecio(otros);
    const rota = PARTES_FINANZAS.filter((p) => sin.has(p)).find((p) => dependenciaFaltante(p, sin));
    if (rota)
      throw reglaDeNegocio(
        `${entradaCatalogo(rota)?.nombre ?? rota} depende de ${entradaCatalogo(moduloId)?.nombre ?? moduloId}: quita antes su precio.`,
      );
    return;
  }
  if (otros.includes(MODULO_FINANZAS))
    throw reglaDeNegocio("Finanzas entero ya tiene precio: quítalo antes de cobrar por partes.");
  const falta = dependenciaFaltante(moduloId, partesConPrecio(otros));
  if (falta) throw reglaDeNegocio(`${falta}: fija primero su precio en esta empresa.`);
}
