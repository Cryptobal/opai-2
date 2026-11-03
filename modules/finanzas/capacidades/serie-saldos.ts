import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { calcularPlanilla, semanasDesde, sumarSemanas, type CeldaFlujo } from "../domain";
import { celdasDominioConCartolaPasada } from "./cartola-planilla";
import { cargarFlujo, lunesHoy } from "./util";
import type { ajustesDe } from "./util";

/** Semanas de historia que la planilla de escritorio muestra antes de la semana en curso. */
export const SEMANAS_HISTORIA = 4;

type Ajustes = Awaited<ReturnType<typeof ajustesDe>>;

/** Primera semana a mostrar: nunca antes de `ajustes.desde` (la base del saldo inicial). */
export function desdeVentana(ajustes: Ajustes, pedido?: string, hoy = lunesHoy()): string {
  const base = pedido ?? sumarSemanas(hoy, -SEMANAS_HISTORIA);
  return base < ajustes.desde ? ajustes.desde : base;
}

/**
 * Serie de saldos única de la planilla, el aviso y la vista previa de «Reprogramar»
 * (hallazgo 2, CAR-181): semanas pasadas con la cartola, futuras con el plan, y el saldo
 * previo calculado con la misma regla desde `ajustes.desde`.
 */
export async function serieSaldos(
  ctx: Contexto,
  ajustes: Ajustes,
  desde: string,
  cantidad: number,
  tx?: TenantTx,
  /** Cambia las celdas plan antes del cálculo (vista previa de «Reprogramar»). */
  transformar?: (celdas: CeldaFlujo[]) => CeldaFlujo[],
) {
  const hoy = lunesHoy();
  const lista = semanasDesde(desde, cantidad);
  const cargado = await cargarFlujo(ctx, desde, sumarSemanas(desde, cantidad - 1), tx);
  let saldoPrevio = ajustes.saldoInicial;
  if (ajustes.desde < desde) {
    const previasHasta = sumarSemanas(desde, -1);
    const cantPrevias =
      Math.round((Date.parse(previasHasta) - Date.parse(ajustes.desde)) / (7 * 86_400_000)) + 1;
    const prevLista = semanasDesde(ajustes.desde, cantPrevias);
    const prev = await cargarFlujo(ctx, ajustes.desde, previasHasta, tx);
    const { dominio } = await celdasDominioConCartolaPasada(ctx, prev.celdasDom, hoy, prevLista);
    const calc = calcularPlanilla({
      saldoInicial: ajustes.saldoInicial,
      umbral: ajustes.umbral,
      semanas: prevLista,
      filas: prev.dominio,
      celdas: dominio,
    });
    saldoPrevio = calc.at(-1)?.saldoFinal ?? ajustes.saldoInicial;
  }
  const { dominio: celdasCalc, extraVista } = await celdasDominioConCartolaPasada(
    ctx,
    transformar ? transformar(cargado.celdasDom) : cargado.celdasDom,
    hoy,
    lista,
  );
  const calculo = calcularPlanilla({
    saldoInicial: saldoPrevio,
    umbral: ajustes.umbral,
    semanas: lista,
    filas: cargado.dominio,
    celdas: celdasCalc,
  });
  return { hoy, lista, calculo, extraVista, ...cargado };
}
