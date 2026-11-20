// Prerregistro de visitas (CAR-478, R14–R15): días del rango y estado por día. Funciones puras: «hoy» entra
// como día `aaaa-mm-dd` ya calculado en la zona de la empresa.

const DIA_MS = 86_400_000;
/** Un prerregistro vale como máximo 30 días (§4.3). */
export const MAX_DIAS_PRERREGISTRO = 30;

export type EstadoDiaPrerregistro = "pendiente" | "no_llego" | "cancelado";

const ms = (dia: string) => Date.parse(`${dia}T00:00:00Z`);

/** Cada día `aaaa-mm-dd` entre `desde` y `hasta`, ambos incluidos. */
export function diasPrerregistro(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  for (let t = ms(desde); t <= ms(hasta); t += DIA_MS) {
    dias.push(new Date(t).toISOString().slice(0, 10));
  }
  return dias;
}

/** Motivo por el que el rango no sirve, o `null` si sirve. */
export function validarRangoPrerregistro(desde: string, hasta: string, hoy: string): string | null {
  if (ms(desde) < ms(hoy)) return "La fecha de inicio ya pasó.";
  if (ms(hasta) < ms(desde)) return "La fecha de término es antes de la de inicio.";
  if ((ms(hasta) - ms(desde)) / DIA_MS + 1 > MAX_DIAS_PRERREGISTRO)
    return `El rango no puede superar ${MAX_DIAS_PRERREGISTRO} días.`;
  return null;
}

/** Estado de un día (R15): un día que ya terminó sin usarse queda «no llegó», sin esperar a ningún proceso. */
export function estadoDiaPrerregistro(d: {
  dia: string;
  hoy: string;
  cancelado: boolean;
}): EstadoDiaPrerregistro {
  if (d.cancelado) return "cancelado";
  return ms(d.dia) < ms(d.hoy) ? "no_llego" : "pendiente";
}
