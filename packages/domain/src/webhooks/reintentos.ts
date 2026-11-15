// CAR-352: espera creciente entre intentos de un evento saliente (referente: Stripe reintenta
// durante unos tres días). Aquí: 1 min, 5 min, 30 min, 2 h, 6 h, 12 h y 24 h, ~45 h en total.

const ESPERAS_MIN = [1, 5, 30, 120, 360, 720, 1440] as const;

/** Intentos en total (el primero más un reintento por cada espera). */
export const MAX_INTENTOS_WEBHOOK = ESPERAS_MIN.length + 1;

/**
 * Cuándo intentar de nuevo tras el intento número `intentos` (1 = el primero falló), o `null` si ya
 * no quedan intentos y la entrega queda en error.
 */
export function proximoIntentoWebhook(intentos: number, desde: Date): Date | null {
  const espera = ESPERAS_MIN[intentos - 1];
  if (intentos < 1 || espera === undefined) return null;
  return new Date(desde.getTime() + espera * 60_000);
}

/**
 * Cuerpo del aviso: solo el hecho, nunca el contenido. El receptor pide el detalle por `/api/v1`
 * con su propia key, así no sale ningún dato personal y valen sus permisos («thin events»).
 */
export function cuerpoWebhook(evento: {
  id: string;
  tipo: string;
  entidadTipo: string | null;
  entidadId: string | null;
  createdAt: Date;
}): string {
  return JSON.stringify({
    id: evento.id,
    tipo: evento.tipo,
    creadoEn: evento.createdAt.toISOString(),
    entidad: evento.entidadTipo ? { tipo: evento.entidadTipo, id: evento.entidadId } : null,
    version: "2026-11-14",
  });
}
