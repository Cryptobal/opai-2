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

export type OpcionesRunner = {
  /** Trabajos reclamados por vuelta: lotes chicos para no retener bloqueos sin usarlos. */
  lote?: number;
  /** Instante (ms) en que el runner deja de reclamar: la función de Vercel dura 60 s. */
  hasta?: number;
  /** Tiempo máximo por trabajo; al vencer se registra como fallo y se reintenta. */
  timeoutMs?: number;
};

function conTimeout<T>(ejecutar: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const control = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    timer = setTimeout(() => {
      const error = new Error(`Excedió ${ms / 1000} s.`);
      control.abort(error);
      rechazar(error);
    }, ms);
  });
  return Promise.race([Promise.resolve().then(() => ejecutar(control.signal)), limite]).finally(
    () => clearTimeout(timer),
  );
}

/**
 * Ejecuta los trabajos vencidos de un tenant en lotes mientras quede tiempo. Un fallo (o un
 * timeout) reintenta con espera exponencial hasta `maxIntentos`.
 */
export async function ejecutarTrabajos(
  ctx: Contexto,
  cola: ColaTrabajos,
  { lote = 5, hasta = Date.now() + 45_000, timeoutMs = 20_000 }: OpcionesRunner = {},
) {
  let reclamados = 0;
  let hechos = 0;
  let fallidos = 0;
  // Se reclama solo si el lote alcanza a terminar dentro del presupuesto.
  while (Date.now() + timeoutMs <= hasta) {
    const tomados = await cola.reclamar(lote);
    reclamados += tomados.length;
    for (const t of tomados) {
      const def = obtenerTrabajo(t.tipo);
      try {
        if (!def) throw new Error(`Tipo de trabajo desconocido: "${t.tipo}".`);
        // Un trabajo que pide más tiempo (consultas al SII) lo recibe, sin pasarse de lo que le queda a la vuelta.
        const limite = Math.max(timeoutMs, Math.min(def.tiempoMaximoMs ?? timeoutMs, hasta - Date.now()));
        await cola.completar(
          t.id,
          await conTimeout((signal) => def.ejecutar(ctx, t.payload, signal), limite),
        );
        hechos += 1;
      } catch (e) {
        fallidos += 1;
        const mensaje = e instanceof Error ? e.message : String(e);
        const reintentar = def && t.intentos < t.maxIntentos ? esperaReintento(t.intentos) : null;
        await cola.fallar(t.id, mensaje.slice(0, 2000), reintentar);
      }
    }
    if (tomados.length < lote) break;
  }
  return { reclamados, hechos, fallidos };
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

const TIPO_CAPTURA_SII = "core.remuneraciones.captura_sii";

const TIPO_CAPTURA_PREVISIONAL = "core.remuneraciones.captura_previsional";
/** Previred publica a comienzos de mes: se intenta cada día del 1 al 7 y el 15 (cada corrida es idempotente). */
const DIAS_CAPTURA_PREVISIONAL = new Set([1, 2, 3, 4, 5, 6, 7, 15]);

/** Encola las capturas de plataforma del día: UF/UTM (SII) y, en su ventana del mes, los indicadores de Previred. */
export async function programarCapturaSii(ctx: Contexto, hoy: string): Promise<boolean> {
  const encolar = async (tipo: string): Promise<boolean> => {
    if (!obtenerTrabajo(tipo)) return false;
    const nuevo = await ctx.transaccion((tx) =>
      ctx.trabajos.encolar(tx, { tipo, payload: { dia: hoy }, claveUnica: `${tipo}:${hoy}` }),
    );
    return !!nuevo;
  };
  const sii = await encolar(TIPO_CAPTURA_SII);
  if (DIAS_CAPTURA_PREVISIONAL.has(Number(hoy.slice(8, 10)))) await encolar(TIPO_CAPTURA_PREVISIONAL);
  return sii;
}

/** Encola trabajos horarios (`hora` = «aaaa-mm-ddTHH» en UTC). */
export async function programarHorarios(ctx: Contexto, hora: string): Promise<string[]> {
  const encolados: string[] = [];
  for (const t of listarTrabajos().filter((x) => x.periodicidad === "horaria")) {
    const nuevo = await ctx.transaccion((tx) =>
      ctx.trabajos.encolar(tx, {
        tipo: t.tipo,
        payload: { hora },
        claveUnica: `${t.tipo}:${hora}`,
      }),
    );
    if (nuevo) encolados.push(t.tipo);
  }
  return encolados;
}
