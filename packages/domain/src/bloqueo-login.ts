/**
 * Cálculo puro del bloqueo de login por fuerza bruta (B1, Brief 07c). Sin base de datos ni Better
 * Auth: solo la aritmética de umbral y espera, para que `@opai/auth` la aplique sobre el estado
 * persistido y sea idéntica en dos instancias. Los umbrales son fijos en código e iguales al
 * comportamiento percibido de 1.0 y al diseño de acceso aprobado («tras 5 intentos pausaremos el
 * acceso por 15 minutos»); hacerlos configurables por tenant queda para B5 (§16.3, decidido).
 */

/** Fallos de contraseña consecutivos que activan la pausa. */
export const LOGIN_MAX_FALLOS = 5;
/** Minutos de pausa de la cuenta una vez alcanzado el umbral. */
export const LOGIN_PAUSA_MINUTOS = 15;

const PAUSA_MS = LOGIN_PAUSA_MINUTOS * 60_000;

/** Estado persistido de una identidad: fallos acumulados y hasta cuándo está pausada. */
export type EstadoBloqueoLogin = {
  fallos: number;
  bloqueadoHasta: Date | null;
};

/** ¿La cuenta está pausada en este instante? (la pausa vencida no bloquea). */
export function cuentaBloqueada(estado: EstadoBloqueoLogin | null, ahora: Date): boolean {
  return estado?.bloqueadoHasta != null && estado.bloqueadoHasta.getTime() > ahora.getTime();
}

/** Milisegundos que faltan para levantar la pausa (0 si no está pausada). */
export function esperaBloqueoMs(estado: EstadoBloqueoLogin | null, ahora: Date): number {
  if (!cuentaBloqueada(estado, ahora)) return 0;
  return (estado as EstadoBloqueoLogin).bloqueadoHasta!.getTime() - ahora.getTime();
}

/**
 * Estado tras un fallo de contraseña. Si la pausa anterior ya venció, la ventana se reinicia (el
 * fallo cuenta como el primero). Al llegar al umbral, se fija una pausa nueva desde `ahora`.
 */
export function trasFalloLogin(
  estado: EstadoBloqueoLogin | null,
  ahora: Date,
): EstadoBloqueoLogin {
  const vencida = estado?.bloqueadoHasta != null && estado.bloqueadoHasta.getTime() <= ahora.getTime();
  const base = vencida ? 0 : (estado?.fallos ?? 0);
  const fallos = base + 1;
  const bloqueadoHasta = fallos >= LOGIN_MAX_FALLOS ? new Date(ahora.getTime() + PAUSA_MS) : null;
  return { fallos, bloqueadoHasta };
}

/** Estado tras un ingreso correcto: limpia el contador y la pausa. */
export function trasExitoLogin(): EstadoBloqueoLogin {
  return { fallos: 0, bloqueadoHasta: null };
}
