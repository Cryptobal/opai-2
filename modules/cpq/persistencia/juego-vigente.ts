import type { JuegoDeValores } from "@opai/domain";

/** R22 mínimo: alguna línea de puesto guardó otra huella que la del juego actual. */
export function juegoDesactualizado(
  huellaActual: string | null | undefined,
  lineas: readonly { tipo: string; sueldoBaseClp: number | null; huellaJuegoValores: string | null }[],
): boolean {
  if (!huellaActual) return false;
  const puestos = lineas.filter((l) => l.tipo === "puesto" && l.sueldoBaseClp);
  if (puestos.length === 0) return false;
  const marcadas = puestos.filter((l) => l.huellaJuegoValores);
  if (marcadas.length === 0) return false;
  const esperada = `07e:${huellaActual}`;
  return marcadas.some((l) => l.huellaJuegoValores !== esperada);
}

export function huellaJuego(juego: JuegoDeValores | null): string | null {
  return juego?.huella ?? null;
}
