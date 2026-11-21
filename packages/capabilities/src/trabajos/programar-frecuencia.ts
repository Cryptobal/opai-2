import type { Contexto } from "../types";
import { listarTrabajos } from "./registro";

async function programarIntervalo(
  ctx: Contexto,
  periodicidad: "horaria" | "cada5min",
  marca: string,
  campo: "hora" | "tramo",
): Promise<string[]> {
  const encolados: string[] = [];
  for (const t of listarTrabajos().filter((x) => x.periodicidad === periodicidad)) {
    const nuevo = await ctx.transaccion((tx) =>
      ctx.trabajos.encolar(tx, {
        tipo: t.tipo,
        payload: { [campo]: marca },
        claveUnica: `${t.tipo}:${marca}`,
      }),
    );
    if (nuevo) encolados.push(t.tipo);
  }
  return encolados;
}

/** Encola trabajos horarios (`hora` = «aaaa-mm-ddTHH» en la hora local del tenant, ver `horaEn`). */
export const programarHorarios = (ctx: Contexto, hora: string) =>
  programarIntervalo(ctx, "horaria", hora, "hora");

/** Encola trabajos cada 5 min (`tramo` = «aaaa-mm-ddTHH:mm» en la hora local del tenant, ver `tramoEn`). */
export const programarCada5Min = (ctx: Contexto, tramo: string) =>
  programarIntervalo(ctx, "cada5min", tramo, "tramo");