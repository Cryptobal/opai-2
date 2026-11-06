// PIN de terreno (CAR-78 · B1, D-02): reglas puras del PIN de 6 dígitos y de su bloqueo por intentos.
// Mecanismo secundario de identificación, siempre disponible y sin biometría (Res. Ex. 38, art. 57).

export const PIN_LARGO = 6;

/** Defectos del bloqueo; la empresa los cambia con los ajustes del núcleo (`terreno_pin_*`). */
export const PIN_INTENTOS_MAXIMOS_DEFECTO = 5;
export const PIN_BLOQUEO_MINUTOS_DEFECTO = 15;

export type ProblemaPin = "formato" | "repetido" | "secuencia" | "igual_al_rut";

export function pinConFormato(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/** ¿Los dígitos suben o bajan de uno en uno (123456, 654321)? */
function esSecuencia(pin: string): boolean {
  const d = [...pin].map(Number);
  const paso = (d[1] ?? 0) - (d[0] ?? 0);
  if (paso !== 1 && paso !== -1) return false;
  return d.every((x, i) => i === 0 || x - (d[i - 1] ?? 0) === paso);
}

/**
 * Problema de un PIN que alguien quiere fijar, o null si sirve. Un PIN de 6 dígitos tiene solo un
 * millón de combinaciones: se descartan los más adivinables (todos iguales, secuencias y los últimos
 * seis dígitos del RUT). El bloqueo por intentos hace el resto.
 */
export function problemaDePin(pin: string, rutCanonico?: string): ProblemaPin | null {
  if (!pinConFormato(pin)) return "formato";
  if (new Set(pin).size === 1) return "repetido";
  if (esSecuencia(pin)) return "secuencia";
  const cuerpo = rutCanonico?.split("-")[0] ?? "";
  if (cuerpo.length >= PIN_LARGO && cuerpo.slice(-PIN_LARGO) === pin) return "igual_al_rut";
  return null;
}

export const MENSAJE_PROBLEMA_PIN: Record<ProblemaPin, string> = {
  formato: "El PIN debe tener exactamente 6 dígitos.",
  repetido: "Elige un PIN que no repita el mismo dígito.",
  secuencia: "Elige un PIN que no sea una secuencia como 123456.",
  igual_al_rut: "Elige un PIN distinto de los últimos dígitos de tu RUT.",
};

export type EstadoIntentos = {
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
};

/** ¿Sigue bloqueada la credencial a esa hora? */
export function estaBloqueada(bloqueadoHasta: Date | null, ahora: Date): boolean {
  return bloqueadoHasta !== null && bloqueadoHasta.getTime() > ahora.getTime();
}

/**
 * Estado tras un intento fallido. Si el bloqueo anterior ya venció, la cuenta parte de cero. Al llegar
 * al máximo se bloquea por `bloqueoMinutos` y el contador vuelve a cero (el siguiente ciclo parte limpio).
 */
export function trasFallo(
  previo: EstadoIntentos,
  ahora: Date,
  politica: { intentosMaximos: number; bloqueoMinutos: number },
): EstadoIntentos {
  const base = estaBloqueada(previo.bloqueadoHasta, ahora)
    ? previo.intentosFallidos
    : previo.bloqueadoHasta
      ? 0
      : previo.intentosFallidos;
  const intentos = base + 1;
  if (intentos >= politica.intentosMaximos) {
    return {
      intentosFallidos: 0,
      bloqueadoHasta: new Date(ahora.getTime() + politica.bloqueoMinutos * 60_000),
    };
  }
  return { intentosFallidos: intentos, bloqueadoHasta: null };
}
