import type { Contexto } from "@opai/capabilities";
import type { CeldaFlujo } from "../domain";
import { derivadasBanco } from "./derivadas/banco";
import type { celdaSchema } from "./esquemas";
import type { z } from "zod";

/** Semanas anteriores al lunes actual: reemplaza celdas persistidas por la capa real de cartola. */
export async function celdasDominioConCartolaPasada(
  ctx: Contexto,
  celdasDom: CeldaFlujo[],
  semanaActual: string,
  semanasRango: readonly string[],
): Promise<{ dominio: CeldaFlujo[]; extraVista: z.infer<typeof celdaSchema>[] }> {
  const pasadas = new Set(semanasRango.filter((s) => s < semanaActual));
  if (pasadas.size === 0) return { dominio: celdasDom, extraVista: [] };

  const sinPasadas = celdasDom.filter((c) => !pasadas.has(c.semana));
  const dominio: CeldaFlujo[] = [...sinPasadas];
  const extraVista: z.infer<typeof celdaSchema>[] = [];

  // Una sola consulta para todas las semanas pasadas del rango (hallazgo 15).
  const ordenadas = [...pasadas].sort();
  const bank = await derivadasBanco(ctx, ordenadas[0], ordenadas.at(-1));
  const enRango = bank.filter((b) => pasadas.has(b.semana));
  for (const b of enRango) {
    dominio.push({ filaId: b.filaId, semana: b.semana, capa: "real", monto: b.monto });
    extraVista.push(b);
  }
  return { dominio, extraVista };
}
