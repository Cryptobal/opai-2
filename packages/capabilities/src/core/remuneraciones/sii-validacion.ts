export type ClaveSiiPublicable = "uf" | "utm";

export const RANGO_UF_CENTAVOS = { min: 1_000_000, max: 20_000_000 } as const;
export const RANGO_UTM_CLP = { min: 10_000, max: 500_000 } as const;
/** ~0,05 % diario sobre UF (referencia histórica SII). */
export const TASA_DIARIA_UF = 0.0005;
/** Tope acumulado UF aunque el hueco sea largo. */
export const TECHO_VARIACION_UF = 0.03;
/** ~5 % mensual UTM, prorrateado por días / 30. */
export const TASA_MENSUAL_UTM = 0.05;
export const TECHO_VARIACION_UTM = 0.06;

/** @deprecated Usar TASA_DIARIA_UF; conservado para tests que importaban el nombre. */
export const VARIACION_MAX_UF = TASA_DIARIA_UF;
/** @deprecated Usar TASA_MENSUAL_UTM. */
export const VARIACION_MAX_UTM = TASA_MENSUAL_UTM;

export function fuenteEsSii(fuente: string): boolean {
  return /^https:\/\/(www\.)?sii\.cl\//i.test(fuente);
}

export function valorEnRango(clave: ClaveSiiPublicable, valor: number): boolean {
  if (!Number.isFinite(valor) || valor < 1) return false;
  if (clave === "uf") return valor >= RANGO_UF_CENTAVOS.min && valor <= RANGO_UF_CENTAVOS.max;
  return valor >= RANGO_UTM_CLP.min && valor <= RANGO_UTM_CLP.max;
}

/** Días calendario entre `desde` (exclusivo del conteo si igual) y `hasta` (aaaa-mm-dd). */
export function diasEntreCivil(desde: string, hasta: string): number {
  const [y1, m1, d1] = desde.split("-").map(Number);
  const [y2, m2, d2] = hasta.split("-").map(Number);
  const ms = Date.UTC(y2!, m2! - 1, d2!) - Date.UTC(y1!, m1! - 1, d1!);
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** Tope de variación relativa acumulada: min(días × tasa, techo). */
export function topeVariacionAcumulada(clave: ClaveSiiPublicable, dias: number): number {
  if (dias <= 0) return 0;
  if (clave === "uf") return Math.min(dias * TASA_DIARIA_UF, TECHO_VARIACION_UF);
  return Math.min((dias / 30) * TASA_MENSUAL_UTM, TECHO_VARIACION_UTM);
}

export function variacionPermitidaAcumulada(
  clave: ClaveSiiPublicable,
  nuevo: number,
  anterior: number,
  dias: number,
): boolean {
  if (!Number.isFinite(anterior) || anterior < 1) return true;
  if (nuevo === anterior) return true;
  const max = topeVariacionAcumulada(clave, dias);
  return Math.abs(nuevo - anterior) / anterior <= max;
}

export function variacionPermitida(
  clave: ClaveSiiPublicable,
  nuevo: number,
  anterior: number,
): boolean {
  const dias = clave === "uf" ? 1 : 30;
  return variacionPermitidaAcumulada(clave, nuevo, anterior, dias);
}
