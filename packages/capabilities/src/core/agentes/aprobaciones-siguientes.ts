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
  // Lo aprobado ya se ejecutó: un error al armar los pasos no puede impedir guardar el resultado.
  const siguientes = c.aprobable.siguientes;
  const porHacer = (() => {
    try {
      return siguientes(salida.data);
    } catch {
      return null;
    }
  })();
  if (!porHacer)
    return [
      {
        capability: a.capability,
        ok: false,
        mensaje: "No se pudieron preparar los pasos siguientes.",
      },
    ];
  const pasos: PasoSiguiente[] = [];
  for (const paso of porHacer) {
    const r = await executeCapability(ctx, paso.capability, paso.input).catch(() => null);
    pasos.push({
      capability: paso.capability,
      ok: r?.ok === true,
      mensaje: r === null ? "No se pudo confirmar el resultado." : r.ok ? null : r.error.message,
    });
  }
  return pasos;
}
