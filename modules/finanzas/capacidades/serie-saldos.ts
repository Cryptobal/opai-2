import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { calcularPlanilla, semanasDesde, sumarSemanas, type CeldaFlujo } from "../domain";
import { saldoDelBanco, type SaldoBanco } from "./bancos/saldo-banco";
import { celdasDominioConCartolaPasada } from "./cartola-planilla";
import { FILAS_VIRTUALES_DOMINIO } from "./filas-virtuales";
import { aNumeroSeguro } from "./esquemas";
import { aFecha, aIso, cargarFlujo, hoyIso, lunesHoy } from "./util";
import type { ajustesDe } from "./util";

/** Semanas de historia que la planilla de escritorio muestra antes de la semana en curso. */
export const SEMANAS_HISTORIA = 4;

type Ajustes = Awaited<ReturnType<typeof ajustesDe>>;

/** Primera semana a mostrar: nunca antes de `ajustes.desde` (la base del saldo inicial). */
export function desdeVentana(ajustes: Ajustes, pedido?: string, hoy = lunesHoy()): string {
  const base = pedido ?? sumarSemanas(hoy, -SEMANAS_HISTORIA);
  return base < ajustes.desde ? ajustes.desde : base;
}

const semanasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / (7 * 86_400_000));

/** De dónde sale el saldo de la serie: el banco de hoy (ADR-073) o, sin saldo de banco, el saldo inicial de los ajustes. */
export type FuenteSaldo = "banco" | "ajustes";

/**
 * Serie de saldos única de la planilla, el aviso y la vista previa de «Reprogramar» (ADR-073).
 * El saldo parte del saldo del banco de hoy (suma de las cuentas activas): las semanas pasadas se calculan hacia
 * atrás con los movimientos de la cartola y las futuras hacia adelante con la proyección. Si ninguna cuenta tiene
 * saldo, cae al saldo inicial de los ajustes (hallazgo 2, CAR-181) y la planilla lo avisa. Solo lectura.
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
  const db = tx ?? ctx.db;
  const banco = await saldoDelBanco(db);
  if (banco.saldo == null) return serieDesdeAjustes(ctx, ajustes, desde, cantidad, hoy, banco, tx, transformar);

  // Se calcula desde la semana más antigua que se necesita hasta la más lejana, y se ancla en la semana en curso.
  const fin = sumarSemanas(desde, cantidad - 1);
  const inicio = desde > hoy ? hoy : desde;
  const finCalc = fin < hoy ? hoy : fin;
  const listaCalc = semanasDesde(inicio, semanasEntre(inicio, finCalc) + 1);
  const cargado = await cargarFlujo(ctx, inicio, finCalc, tx);
  const { dominio: celdasCalc, extraVista } = await celdasDominioConCartolaPasada(
    ctx,
    transformar ? transformar(cargado.celdasDom) : cargado.celdasDom,
    hoy,
    listaCalc,
    tx,
  );
  const base = {
    umbral: ajustes.umbral,
    semanas: listaCalc,
    filas: [...cargado.dominio, ...FILAS_VIRTUALES_DOMINIO],
    celdas: celdasCalc,
  };
  // Saldo al comenzar la semana en curso = saldo del banco − lo ya movido esta semana (hasta hoy) en las cuentas que
  // suman en ese saldo: las inactivas o sin saldo no lo componen, y lo que lleve fecha futura aún no pasó.
  const movidos = await db.movimientoBancario.findMany({
    where: {
      estado: { not: "ignorado" },
      cuentaId: { in: banco.cuentaIdsConSaldo },
      fecha: { gte: aFecha(hoy), lte: aFecha(hoyIso()) },
    },
    select: { monto: true },
  });
  const aperturaSemana = banco.saldo - movidos.reduce((t, m) => t + aNumeroSeguro(m.monto), 0);
  const inicialSinAncla = calcularPlanilla({ ...base, saldoInicial: 0 }).find((s) => s.semana === hoy)?.saldoInicial ?? 0;
  const calc = calcularPlanilla({ ...base, saldoInicial: aperturaSemana - inicialSinAncla });

  const lista = semanasDesde(desde, cantidad);
  const enVentana = new Set(lista);
  return {
    hoy,
    lista,
    calculo: calc.filter((s) => enVentana.has(s.semana)),
    extraVista: extraVista.filter((c) => enVentana.has(c.semana)),
    ...cargado,
    celdas: cargado.celdas.filter((c) => enVentana.has(aIso(c.semana))),
    banco: { ...banco, fuente: "banco" as FuenteSaldo },
  };
}

/** Respaldo sin saldo de banco: el saldo inicial de los ajustes parte en `ajustes.desde` y se arrastra hasta `desde`. */
async function serieDesdeAjustes(
  ctx: Contexto,
  ajustes: Ajustes,
  desde: string,
  cantidad: number,
  hoy: string,
  banco: SaldoBanco,
  tx?: TenantTx,
  transformar?: (celdas: CeldaFlujo[]) => CeldaFlujo[],
) {
  const lista = semanasDesde(desde, cantidad);
  const cargado = await cargarFlujo(ctx, desde, sumarSemanas(desde, cantidad - 1), tx);
  let saldoPrevio = ajustes.saldoInicial;
  if (ajustes.desde < desde) {
    const previasHasta = sumarSemanas(desde, -1);
    const prevLista = semanasDesde(ajustes.desde, semanasEntre(ajustes.desde, previasHasta) + 1);
    const prev = await cargarFlujo(ctx, ajustes.desde, previasHasta, tx);
    const { dominio } = await celdasDominioConCartolaPasada(ctx, prev.celdasDom, hoy, prevLista, tx);
    const previo = calcularPlanilla({
      saldoInicial: ajustes.saldoInicial,
      umbral: ajustes.umbral,
      semanas: prevLista,
      filas: [...prev.dominio, ...FILAS_VIRTUALES_DOMINIO],
      celdas: dominio,
    });
    saldoPrevio = previo.at(-1)?.saldoFinal ?? ajustes.saldoInicial;
  }
  const { dominio: celdasCalc, extraVista } = await celdasDominioConCartolaPasada(
    ctx,
    transformar ? transformar(cargado.celdasDom) : cargado.celdasDom,
    hoy,
    lista,
    tx,
  );
  const calculo = calcularPlanilla({
    saldoInicial: saldoPrevio,
    umbral: ajustes.umbral,
    semanas: lista,
    filas: [...cargado.dominio, ...FILAS_VIRTUALES_DOMINIO],
    celdas: celdasCalc,
  });
  return { hoy, lista, calculo, extraVista, ...cargado, banco: { ...banco, fuente: "ajustes" as FuenteSaldo } };
}
