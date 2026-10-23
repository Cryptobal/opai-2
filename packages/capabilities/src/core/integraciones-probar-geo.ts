import { geoDe } from "../integraciones/adaptadores";
import type { Contexto } from "../types";

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Prueba las dos APIs que usa la pantalla: Geocoding y Places (autocompletar). Si alguna falla,
 * lanza con el detalle de cada una para que la integración quede en `error` con su `ultimo_error`.
 */
export async function probarGeo(ctx: Contexto): Promise<void> {
  const geo = await geoDe(ctx);
  if (!geo) throw new Error("La geolocalización no está disponible en este entorno.");
  const fallas: string[] = [];
  try {
    if (!(await geo.geocodificar("Plaza de Armas, Santiago"))) {
      fallas.push("Geocodificación: sin resultados.");
    }
  } catch (e) {
    fallas.push(`Geocodificación: ${mensajeDe(e)}`);
  }
  try {
    const sugerencias = await geo.autocompletar("Plaza de Armas Santiago");
    if (sugerencias.length === 0) fallas.push("Autocompletado: sin sugerencias.");
  } catch (e) {
    fallas.push(`Autocompletado: ${mensajeDe(e)}`);
  }
  if (fallas.length > 0) throw new Error(fallas.join(" "));
}
