import type { Contexto } from "@opai/capabilities";
import {
  clavesFaltantes,
  mutualAdicionalTenant,
  publicacionesParaFecha,
} from "@opai/capabilities";
import type { ValorIndicador } from "@opai/domain";
import { juegoDeValores, ValorLegalFaltante, type JuegoDeValores } from "@opai/domain";

export { mutualAdicionalTenant };

/** Publicaciones legales del tenant para el motor 07e. */
export async function valoresLegalesTenant(ctx: Contexto, fecha: string): Promise<readonly ValorIndicador[]> {
  return publicacionesParaFecha(ctx, fecha);
}

/**
 * `pendiente` conserva el texto histórico de la advertencia; `faltante` es el indicador que falta
 * (para el aviso tipado `juego_legal_faltante`). La mutual ya no bloquea el juego (CAR-162).
 */
export type JuegoResuelto = { juego: JuegoDeValores | null; pendiente?: string; faltante?: string };

/** Juego legal congelado; null solo si faltan publicaciones legales para la fecha. */
export async function juegoParaFecha(ctx: Contexto, fecha: string): Promise<JuegoResuelto> {
  const valores = await valoresLegalesTenant(ctx, fecha);
  const faltantes = clavesFaltantes(fecha, valores);
  const primero = faltantes[0];
  if (primero) return { juego: null, pendiente: `costo pendiente: falta ${primero}`, faltante: primero };
  try {
    return { juego: await juegoDeValores(fecha, valores) };
  } catch (e) {
    if (e instanceof ValorLegalFaltante) {
      return { juego: null, pendiente: `costo pendiente: falta ${e.indicador}`, faltante: e.indicador };
    }
    return { juego: null, pendiente: "costo pendiente: indicadores incompletos", faltante: "indicadores" };
  }
}

/** Mutual adicional usada en el cálculo: la confirmada o 0 % supuesto (decisión de Carlos, 3-nov-2026). */
export type MutualResuelta = { tasa: number; confirmada: boolean };

/**
 * Sin confirmar, la tasa adicional se calcula con 0 % y se marca como supuesta: no se escribe nada
 * en `core.remuneraciones_perfil` y la tasa sigue pendiente hasta que alguien la confirme.
 */
export async function mutualParaCalculo(ctx: Contexto): Promise<MutualResuelta> {
  const tasa = await mutualAdicionalTenant(ctx);
  return tasa == null ? { tasa: 0, confirmada: false } : { tasa, confirmada: true };
}
