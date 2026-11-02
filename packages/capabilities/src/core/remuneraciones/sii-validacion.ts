export type ClaveSiiPublicable = "uf" | "utm";

export const RANGO_UF_CENTAVOS = { min: 1_000_000, max: 20_000_000 } as const;
export const RANGO_UTM_CLP = { min: 10_000, max: 500_000 } as const;
export const VARIACION_MAX_UF = 0.05;
export const VARIACION_MAX_UTM = 0.25;

export function fuenteEsSii(fuente: string): boolean {
  return /^https:\/\/(www\.)?sii\.cl\//i.test(fuente);
}

export function valorEnRango(clave: ClaveSiiPublicable, valor: number): boolean {
  if (!Number.isFinite(valor) || valor < 1) return false;
  if (clave === "uf") return valor >= RANGO_UF_CENTAVOS.min && valor <= RANGO_UF_CENTAVOS.max;
  return valor >= RANGO_UTM_CLP.min && valor <= RANGO_UTM_CLP.max;
}

export function variacionPermitida(
  clave: ClaveSiiPublicable,
  nuevo: number,
  anterior: number,
): boolean {
  if (!Number.isFinite(anterior) || anterior < 1) return true;
  if (nuevo === anterior) return true;
  const max = clave === "uf" ? VARIACION_MAX_UF : VARIACION_MAX_UTM;
  return Math.abs(nuevo - anterior) / anterior <= max;
}
