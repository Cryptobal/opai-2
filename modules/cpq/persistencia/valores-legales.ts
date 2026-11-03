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

export type JuegoResuelto = { juego: JuegoDeValores | null; pendiente?: string };

export const AVISO_MUTUAL_SIN_CONFIRMAR = "costo pendiente: mutual adicional sin confirmar";

/** Tasa para el motor: 0 % si la mutual no está confirmada (CAR-162). */
export async function mutualAdicionalCalculo(
  ctx: Contexto,
): Promise<{ tasaEscalada: number; confirmada: boolean }> {
  const confirmada = await mutualAdicionalTenant(ctx);
  return { tasaEscalada: confirmada ?? 0, confirmada: confirmada != null };
}

/** Juego legal congelado; null si faltan publicaciones del tenant (la mutual no bloquea el juego). */
export async function juegoParaFecha(ctx: Contexto, fecha: string): Promise<JuegoResuelto> {
  const valores = await valoresLegalesTenant(ctx, fecha);
  const faltantes = clavesFaltantes(fecha, valores);
  if (faltantes.length > 0) return { juego: null, pendiente: `costo pendiente: falta ${faltantes[0]}` };
  try {
    return { juego: await juegoDeValores(fecha, valores) };
  } catch (e) {
    const msg = e instanceof ValorLegalFaltante ? `costo pendiente: falta ${e.indicador}` : "costo pendiente: indicadores incompletos";
    return { juego: null, pendiente: msg };
  }
}
