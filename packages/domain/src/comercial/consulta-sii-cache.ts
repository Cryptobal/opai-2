// Caché de la consulta de contribuyente al SII por (empresa, RUT) (CAR-156). Dominio puro: qué
// respuestas se guardan, cuánto valen y cuándo se puede volver a preguntar. Lo usan la fuente de
// `core.cuentas.consultar_sii`/`aplicar_sii`, el trabajo encolado y el importador.

/** Respuestas definitivas del SII: las únicas que se guardan. «Sin respuesta» o «no configurado» no. */
export const ESTADOS_CACHE_SII = ["ok", "sin_inicio", "no_encontrado"] as const;
export type EstadoCacheSii = (typeof ESTADOS_CACHE_SII)[number];

const DIA_MS = 86_400_000;

/**
 * Vigencia por estado: los datos tributarios cambian poco (30 días); sin inicio de actividades, 7; un RUT sin registros se vuelve a
 * preguntar al día siguiente (puede ser un inicio de actividades reciente).
 */
export const VIGENCIA_CACHE_SII_DIAS: Record<EstadoCacheSii, number> = {
  ok: 30,
  sin_inicio: 7,
  no_encontrado: 1,
};

/** Piso entre dos consultas pedidas a mano («volver a consultar»): no se martilla al proveedor. */
export const REFRESCO_MINIMO_SII_MS = 10 * 60_000;

export function esEstadoCacheSii(estado: string): estado is EstadoCacheSii {
  return (ESTADOS_CACHE_SII as readonly string[]).includes(estado);
}

/** Hasta cuándo vale una respuesta guardada. */
export function venceCacheSii(estado: EstadoCacheSii, consultadoEn: Date): Date {
  return new Date(consultadoEn.getTime() + VIGENCIA_CACHE_SII_DIAS[estado] * DIA_MS);
}

/** Una fila de caché sirve si no venció. */
export function cacheSiiVigente(venceEn: Date, ahora: Date): boolean {
  return venceEn.getTime() > ahora.getTime();
}

/**
 * Si una consulta pedida con «refrescar» puede salir al proveedor: solo si la guardada tiene más de
 * `REFRESCO_MINIMO_SII_MS`. Si no, se reutiliza la caché (aunque se haya pedido refrescar).
 */
export function puedeRefrescarSii(consultadoEn: Date, ahora: Date): boolean {
  return ahora.getTime() - consultadoEn.getTime() >= REFRESCO_MINIMO_SII_MS;
}

/** Clave única del trabajo encolado: a lo más una consulta encolada por RUT y día en cada empresa. */
export function claveConsultaSii(rut: string, ahora: Date): string {
  return `core.sii.consultar_contribuyente:${rut}:${ahora.toISOString().slice(0, 10)}`;
}
