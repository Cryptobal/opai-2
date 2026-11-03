/** Id público en la bandeja unificada (Configuración › Aprobaciones). */
export type TipoBandejaCpq = "margen" | "envio";

const PREFIJOS: Record<TipoBandejaCpq, string> = { margen: "cpq-m/", envio: "cpq-e/" };

export function idBandejaCpq(tipo: TipoBandejaCpq, refId: string) {
  return `${PREFIJOS[tipo]}${refId}`;
}

export function parseIdBandejaCpq(id: string): { tipo: TipoBandejaCpq; refId: string } | null {
  if (id.startsWith(PREFIJOS.margen)) return { tipo: "margen", refId: id.slice(PREFIJOS.margen.length) };
  if (id.startsWith(PREFIJOS.envio)) return { tipo: "envio", refId: id.slice(PREFIJOS.envio.length) };
  return null;
}

export function esIdBandejaCpq(id: string) {
  return parseIdBandejaCpq(id) !== null;
}
