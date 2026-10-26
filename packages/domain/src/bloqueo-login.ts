/**
 * Cálculo puro del bloqueo de login por fuerza bruta (B1, Brief 07c). Sin base de datos ni Better
 * Auth: solo la aritmética de la ventana y los límites, para que `@opai/auth` la aplique sobre los
 * intentos persistidos y sea idéntica en dos instancias.
 *
 * El bloqueo se decide **contando los intentos de contraseña fallidos** en una ventana, no con un
 * contador mutable: así es atómico por construcción (cada fallo es un `INSERT` independiente, sin
 * carrera de lectura-escritura) y se puede medir por varias dimensiones a la vez. Se pausa por tres
 * límites (decisión del Núcleo, Brief 07c; §16.3 y §4.1 fijan «Opción A» y la política completa,
 * delegada por Carlos en los turnos t365u y t366u; valores en código iguales a 1.0):
 *   - correo + IP: freno fino al atacante que repite contra una cuenta desde un punto;
 *   - correo (global): tope más alto desde cualquier IP, por si distribuye el ataque;
 *   - IP: tope compartido en la base, para que un POST directo no se salte el límite por IP.
 * Los tres cuentan solo fallos de contraseña; un ingreso correcto reinicia el contador del correo, y
 * un restablecimiento de contraseña exitoso también lo reinicia. Para no dejar que un tercero pause a
 * la víctima llenando el tope global desde varias IP, las IP que entraron bien a ese correo hace poco
 * quedan **exentas del tope global** (solo les aplica su tope por correo+IP): `exentaGlobal`.
 */

/** Ventana de conteo de fallos de login (minutos). Fija en código; configurable por tenant en B5. */
export const LOGIN_VENTANA_MINUTOS = 15;
export const LOGIN_VENTANA_MS = LOGIN_VENTANA_MINUTOS * 60_000;

/** Fallos de contraseña tolerados en la ventana, por dimensión. */
export const LOGIN_LIMITE_CORREO_IP = 5;
export const LOGIN_LIMITE_CORREO = 20;
export const LOGIN_LIMITE_IP = 30;

/** Conteos de fallos de contraseña en la ventana, por dimensión. */
export type ConteosLogin = {
  /** Fallos del mismo correo desde la misma IP. */
  correoIp: number;
  /** Fallos del mismo correo desde cualquier IP (tope global). */
  correo: number;
  /** Fallos de cualquier correo desde la misma IP (tope compartido). */
  ip: number;
  /**
   * La IP ya entró bien a este correo dentro de la retención (30 días): queda exenta del tope global
   * del correo. Evita que un tercero, llenando el tope global desde otras IP, pause a la víctima:
   * su IP de siempre sigue entrando si trae la contraseña correcta, sujeta solo a su tope correo+IP.
   */
  exentaGlobal: boolean;
};

/** ¿Alguna dimensión alcanzó o superó su límite de fallos en la ventana? */
export function superaLimiteLogin(c: ConteosLogin): boolean {
  return (
    c.correoIp >= LOGIN_LIMITE_CORREO_IP ||
    (!c.exentaGlobal && c.correo >= LOGIN_LIMITE_CORREO) ||
    c.ip >= LOGIN_LIMITE_IP
  );
}
