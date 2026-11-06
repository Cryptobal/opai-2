import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { calcularPlanilla, semanasDesde, sumarSemanas, type CeldaFlujo } from "../domain";
import { saldoDelBanco, type SaldoBanco } from "./bancos/saldo-banco";
import { celdasDominioConCartolaPasada } from "./cartola-planilla";
import { celdasCobrosEsperados } from "./cobros-esperados";
import { celdasAbonosSemana } from "./abonos-semana";
import { movidosDeLaSemana } from "./semana-en-curso";
import { celdasDiferenciaFactoring, celdasImpuestos } from "./impuestos-planilla";
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
  const pasada = await celdasDominioConCartolaPasada(
    ctx,
    transformar ? transformar(cargado.celdasDom) : cargado.celdasDom,
    hoy,
    listaCalc,
    tx,
  );
  const cobros = await celdasCobrosEsperados(ctx, listaCalc);
  const impuestos = await celdasImpuestos(ctx, listaCalc);
  // Lo movido esta semana que el saldo del banco ya incluye: la apertura lo resta y los abonos vuelven como ingreso real.
  const movidos = await movidosDeLaSemana(db, banco, hoy);
  const abonos = await celdasAbonosSemana(ctx, hoy, movidos, tx);
  const celdasCalc = [...pasada.dominio, ...abonos.dominio, ...cobros.dominio, ...impuestos.dominio];
  const extraVista = [...pasada.extraVista, ...abonos.vista, ...cobros.vista, ...impuestos.vista, ...(await celdasDiferenciaFactoring(ctx, cobros.diferencias))];
  const base = {
    umbral: ajustes.umbral,
    semanas: listaCalc,
    filas: [...cargado.dominio, ...FILAS_VIRTUALES_DOMINIO],
    celdas: celdasCalc,
  };
  // Saldo al comenzar la semana en curso: por cada cuenta que suma en el saldo del banco, su saldo menos lo movido
  // esta semana hasta la fecha de ESE saldo (lo posterior no está en él) y no más allá de hoy.
  const yaIncluido = movidos.reduce((t, m) => t + m.monto, 0);
  const aperturaSemana = banco.saldo - yaIncluido;
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
    avisos: cobros.avisos,
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
  const pasada = await celdasDominioConCartolaPasada(
    ctx,
    transformar ? transformar(cargado.celdasDom) : cargado.celdasDom,
    hoy,
    lista,
    tx,
  );
  const cobros = await celdasCobrosEsperados(ctx, lista);
  const impuestos = await celdasImpuestos(ctx, lista);
  const celdasCalc = [...pasada.dominio, ...cobros.dominio, ...impuestos.dominio];
  const extraVista = [...pasada.extraVista, ...cobros.vista, ...impuestos.vista, ...(await celdasDiferenciaFactoring(ctx, cobros.diferencias))];
  const calculo = calcularPlanilla({
    saldoInicial: saldoPrevio,
    umbral: ajustes.umbral,
    semanas: lista,
    filas: [...cargado.dominio, ...FILAS_VIRTUALES_DOMINIO],
    celdas: celdasCalc,
  });
  return { hoy, lista, calculo, extraVista, ...cargado, avisos: cobros.avisos, banco: { ...banco, fuente: "ajustes" as FuenteSaldo } };
}
