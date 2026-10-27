/**
 * Rate limit centralizado (NÚCLEO-B). `permitir` consume una unidad de la ventana en la base
 * (`core.rate_limit_consumir`, misma cuenta para todas las instancias de Vercel). Si la base falla,
 * falla ABIERTO con un respaldo en memoria por instancia y avisa sin datos personales. El triaje de
 * fallos de login (`bloqueado`/`registrarFallo`/`olvidar`) sigue en memoria como primera barrera barata:
 * el tope real de login está persistido por cuenta en la base (`@opai/auth`, B1 del Brief 07c).
 */
import { consumirRateLimit, purgarVentanasRateLimit } from "@opai/db";

/**
 * Topes por ventana. Los fijó Claude para esta primera versión (NÚCLEO-B), a confirmar por Carlos
 * (anotados en el PR-BODY): generosos para el uso normal, suficientes para cortar abuso y enumeración.
 */
export const LIMITES = {
  /** API v1 y MCP, por API key o usuario: 120 por minuto. */
  apiPorPrincipal: { maximo: 120, ventanaMs: 60_000 },
  /** API v1 y MCP, por IP (compartida en oficinas): 240 por minuto. */
  apiPorIp: { maximo: 240, ventanaMs: 60_000 },
  /** Recuperar contraseña, por IP: 10 cada 15 minutos. */
  recuperar: { maximo: 10, ventanaMs: 15 * 60_000 },
  /** Invitación (ver/aceptar/pedir otra), por IP: 30 cada 15 minutos. */
  invitacion: { maximo: 30, ventanaMs: 15 * 60_000 },
  /** Verificación pública de comprobantes, por IP: 30 por minuto. */
  verificar: { maximo: 30, ventanaMs: 60_000 },
  /** /api/existe (proxy interno), por IP: 120 por minuto. */
  existe: { maximo: 120, ventanaMs: 60_000 },
  /** Proxy de mapas, por usuario: 30 por minuto. */
  geoMapa: { maximo: 30, ventanaMs: 60_000 },
} as const;

/** Respaldo en memoria por instancia: la barrera de login y el fallo abierto del límite central. */
const ventanas = new Map<string, { inicio: number; n: number }>();

function consumirMemoria(clave: string, maximo: number, ventanaMs: number, ahora = Date.now()): boolean {
  const v = ventanas.get(clave);
  if (!v || ahora - v.inicio >= ventanaMs) {
    ventanas.set(clave, { inicio: ahora, n: 1 });
    if (ventanas.size > 10_000) ventanas.clear();
    return true;
  }
  v.n += 1;
  return v.n <= maximo;
}

/** Ámbito de la clave (antes del primer `:`): sin datos personales, apto para logs (Ley 21.719). */
const ambito = (clave: string) => clave.split(":")[0] ?? "rate-limit";

/**
 * ¿Se permite una solicitud más de `clave` en su ventana? Consume una unidad en la base. Si la base
 * falla, falla abierto con el respaldo en memoria y avisa con el ámbito (nunca la key ni la IP).
 */
export async function permitir(clave: string, maximo: number, ventanaMs = 60_000): Promise<boolean> {
  try {
    const r = await consumirRateLimit(clave, maximo, Math.ceil(ventanaMs / 1000));
    return r.permitido;
  } catch {
    console.warn(`[rate-limit] base no disponible; respaldo en memoria para el ámbito "${ambito(clave)}"`);
    return consumirMemoria(clave, maximo, ventanaMs);
  }
}

/** Purga las ventanas vencidas del rate limit central. La llama el programador (cron diario). */
export async function purgarVentanas(retencionS?: number): Promise<number> {
  return purgarVentanasRateLimit(retencionS);
}

/** ¿La clave superó `maximo` fallos en la ventana? No cuenta nada (solo consulta). Barrera de login en memoria. */
export function bloqueado(clave: string, maximo: number, ventanaMs: number, ahora = Date.now()): boolean {
  const v = ventanas.get(clave);
  return !!v && ahora - v.inicio < ventanaMs && v.n >= maximo;
}

/** Registra un fallo (p. ej. credenciales inválidas) en la ventana de la clave. Barrera de login en memoria. */
export function registrarFallo(clave: string, ventanaMs: number, ahora = Date.now()): void {
  const v = ventanas.get(clave);
  if (!v || ahora - v.inicio >= ventanaMs) {
    ventanas.set(clave, { inicio: ahora, n: 1 });
    if (ventanas.size > 10_000) ventanas.clear();
    return;
  }
  v.n += 1;
}

/** Olvida los fallos de una clave (login exitoso). */
export function olvidar(clave: string): void {
  ventanas.delete(clave);
}

/** IP del cliente a partir de las cabeceras (Vercel pone `x-forwarded-for`). */
export function ipDeCabeceras(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local";
}

export function ipDe(req: Request): string {
  return ipDeCabeceras(req.headers);
}

/** Solo para tests: vacía el respaldo en memoria. */
export function limpiarVentanas(): void {
  ventanas.clear();
}
