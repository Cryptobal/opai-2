import { executeCapability } from "../../execute";
import { obtenerCapacidad } from "../../registry";
import type { Contexto } from "../../types";

export type PasoSiguiente = { capability: string; ok: boolean; mensaje: string | null };

/**
 * Tras aprobar una solicitud pedida por una regla de la empresa (CAR-253), ejecuta los pasos que la
 * pantalla de quien la pidió habría hecho sola: por ejemplo, enviar al SII el documento recién emitido
 * (ADR-096). Corre como quien aprueba, con sus permisos. Un paso que falla no deshace lo aprobado: queda
 * anotado para que la persona lo reintente desde la ficha.
 *
 * Las solicitudes de un agente (sin regla) no pasan por aquí: el agente encadena sus propios pasos.
 */
export async function ejecutarSiguientes(
  ctx: Contexto,
  a: { capability: string; reglaId: string | null },
  resultado: { ok: boolean; data?: unknown },
): Promise<PasoSiguiente[]> {
  const c = obtenerCapacidad(a.capability);
  if (!a.reglaId || !resultado.ok || !c?.aprobable?.siguientes) return [];
  const salida = c.output.safeParse(resultado.data);
  if (!salida.success) return [];
  const pasos: PasoSiguiente[] = [];
  for (const paso of c.aprobable.siguientes(salida.data)) {
    const r = await executeCapability(ctx, paso.capability, paso.input).catch(() => null);
    pasos.push({
      capability: paso.capability,
      ok: r?.ok === true,
      mensaje: r === null ? "No se pudo confirmar el resultado." : r.ok ? null : r.error.message,
    });
  }
  return pasos;
}
