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

/** Juego legal congelado; null si faltan publicaciones o mutual adicional del tenant. */
export async function juegoParaFecha(ctx: Contexto, fecha: string): Promise<JuegoResuelto> {
  const valores = await valoresLegalesTenant(ctx, fecha);
  const faltantes = clavesFaltantes(fecha, valores);
  if (faltantes.length > 0) return { juego: null, pendiente: `costo pendiente: falta ${faltantes[0]}` };
  const mutual = await mutualAdicionalTenant(ctx);
  if (mutual == null) return { juego: null, pendiente: "costo pendiente: falta mutual adicional" };
  try {
    return { juego: await juegoDeValores(fecha, valores) };
  } catch (e) {
    const msg = e instanceof ValorLegalFaltante ? `costo pendiente: falta ${e.indicador}` : "costo pendiente: indicadores incompletos";
    return { juego: null, pendiente: msg };
  }
}
