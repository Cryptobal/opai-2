import type { JuegoDeValores } from "@opai/domain";

/** Sufijo de la huella de línea cuando la mutual adicional se calculó con 0 % supuesto (CAR-162). */
export const SUFIJO_MUTUAL_SUPUESTA = ":mutual-supuesta";

/**
 * Huella que guarda cada línea de puesto: la del juego legal y, si la mutual no estaba confirmada,
 * la marca de 0 % supuesto. Con la mutual confirmada la huella no cambia respecto de la anterior a
 * CAR-162, así que las cotizaciones existentes no quedan desactualizadas por esto.
 */
export function huellaLinea(huellaJuegoDeValores: string, mutualConfirmada: boolean): string {
  return `07e:${huellaJuegoDeValores}${mutualConfirmada ? "" : SUFIJO_MUTUAL_SUPUESTA}`;
}

/** R22 mínimo: alguna línea de puesto guardó otra huella que la esperada hoy. */
export function juegoDesactualizado(
  huellaActual: string | null | undefined,
  lineas: readonly { tipo: string; sueldoBaseClp: number | null; huellaJuegoValores: string | null }[],
  mutualConfirmada = true,
): boolean {
  if (!huellaActual) return false;
  const puestos = lineas.filter((l) => l.tipo === "puesto" && l.sueldoBaseClp);
  if (puestos.length === 0) return false;
  const marcadas = puestos.filter((l) => l.huellaJuegoValores);
  if (marcadas.length === 0) return false;
  const esperada = huellaLinea(huellaActual, mutualConfirmada);
  return marcadas.some((l) => l.huellaJuegoValores !== esperada);
}

export function huellaJuego(juego: JuegoDeValores | null): string | null {
  return juego?.huella ?? null;
}
