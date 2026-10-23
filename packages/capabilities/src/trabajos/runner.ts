import type { Contexto } from "../types";
import { listarTrabajos, obtenerTrabajo } from "./registro";

export type TrabajoReclamado = {
  id: string;
  tipo: string;
  payload: unknown;
  intentos: number;
  maxIntentos: number;
};

/** Cola de un tenant. La real vive en `@opai/db` (FOR UPDATE SKIP LOCKED); los tests usan memoria. */
export interface ColaTrabajos {
  reclamar(limite: number): Promise<TrabajoReclamado[]>;
  completar(id: string, resultado: unknown): Promise<void>;
  fallar(id: string, error: string, reintentarEn: Date | null): Promise<void>;
}

/** Espera exponencial: 2, 4, 8, 16… minutos. */
export const esperaReintento = (intentos: number, ahora = Date.now()) =>
  new Date(ahora + 2 ** Math.min(intentos, 10) * 60_000);

/** Ejecuta los trabajos vencidos de un tenant. Un fallo reintenta hasta `maxIntentos`. */
export async function ejecutarTrabajos(ctx: Contexto, cola: ColaTrabajos, limite = 20) {
  const reclamados = await cola.reclamar(limite);
  let hechos = 0;
  let fallidos = 0;
  for (const t of reclamados) {
    const def = obtenerTrabajo(t.tipo);
    try {
      if (!def) throw new Error(`Tipo de trabajo desconocido: "${t.tipo}".`);
      await cola.completar(t.id, await def.ejecutar(ctx, t.payload));
      hechos += 1;
    } catch (e) {
      fallidos += 1;
      const mensaje = e instanceof Error ? e.message : String(e);
      const reintentar = def && t.intentos < t.maxIntentos ? esperaReintento(t.intentos) : null;
      await cola.fallar(t.id, mensaje.slice(0, 2000), reintentar);
    }
  }
  return { reclamados: reclamados.length, hechos, fallidos };
}

/** Encola los trabajos diarios del tenant para `hoy` ("aaaa-mm-dd" en la zona del tenant). */
export async function programarPeriodicos(ctx: Contexto, hoy: string): Promise<string[]> {
  const encolados: string[] = [];
  for (const t of listarTrabajos().filter((x) => x.periodicidad === "diaria")) {
    const nuevo = await ctx.transaccion((tx) =>
      ctx.trabajos.encolar(tx, {
        tipo: t.tipo,
        payload: { dia: hoy },
        claveUnica: `${t.tipo}:${hoy}`,
      }),
    );
    if (nuevo) encolados.push(t.tipo);
  }
  return encolados;
}
