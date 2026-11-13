import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { calcularPlanilla, semanasDesde, sumarSemanas, type CeldaFlujo } from "../domain";
import { saldoDelBanco, type SaldoBanco } from "./bancos/saldo-banco";
import { celdasDominioConCartolaPasada } from "./cartola-planilla";
import { celdasCobrosEsperados } from "./cobros-esperados";
import { celdasRecurrentes } from "./recurrentes-planilla";
import { celdasAbonosSemana } from "./abonos-semana";
import { llevarSaldo } from "./saldo-llevado";
import { movidosDeLaSemana } from "./semana-en-curso";
import { celdasDiferenciaFactoring, celdasImpuestos } from "./impuestos-planilla";
import { FILAS_VIRTUALES_DOMINIO } from "./filas-virtuales";
import { aIso, cargarFlujo, lunesHoy } from "./util";
import type { ajustesDe } from "./util";

/** Semanas de historia que la planilla de escritorio muestra antes de la semana en curso. */
export const SEMANAS_HISTORIA = 4;

type Ajustes = Awaited<ReturnType<typeof ajustesDe>>;

/** Primera semana a mostrar: la pedida o, por defecto, unas semanas de historia antes de la semana en curso. */
export function desdeVentana(pedido?: string, hoy = lunesHoy()): string {
  return pedido ?? sumarSemanas(hoy, -SEMANAS_HISTORIA);
}

const semanasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / (7 * 86_400_000));

/**
 * De dónde sale el saldo de la serie: el banco de hoy (ADR-073) o, si ninguna cuenta tiene saldo, $0. No hay saldo de
 * partida: el flujo proyecta desde lo que hay hoy en el banco (regla de Carlos del 13-nov-2026, CAR-391).
 */
export type FuenteSaldo = "banco" | "sin_banco";

/**
 * Serie de saldos única de la planilla, el aviso y la vista previa de «Reprogramar» (ADR-073).
 * El saldo parte del saldo del banco de hoy (suma de las cuentas activas): las semanas pasadas se calculan hacia
 * atrás con los movimientos de la cartola y las futuras hacia adelante con la proyección. Si ninguna cuenta tiene
 * saldo, parte en $0 y la planilla avisa que falta conectar el banco o cargar una cartola (CAR-391). Solo lectura.
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
  const leido = await saldoDelBanco(db);
  const fuente: FuenteSaldo = leido.saldo == null ? "sin_banco" : "banco";
  const banco: SaldoBanco = { ...leido, saldo: leido.saldo ?? 0 };

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
  const recurrentes = await celdasRecurrentes(ctx, hoy, listaCalc, tx);
  const celdasCalc = [...pasada.dominio, ...abonos.dominio, ...cobros.dominio, ...impuestos.dominio, ...recurrentes.dominio];
  const extraVista = [...pasada.extraVista, ...abonos.vista, ...cobros.vista, ...impuestos.vista, ...recurrentes.vista, ...(await celdasDiferenciaFactoring(ctx, cobros.diferencias))];
  const base = {
    umbral: ajustes.umbral,
    semanas: listaCalc,
    filas: [...cargado.dominio, ...FILAS_VIRTUALES_DOMINIO],
    celdas: celdasCalc,
  };
  // Saldo al comenzar la semana en curso: el saldo conocido de cada cuenta llevado con la cartola desde su fecha
  // hasta el domingo anterior. Con un saldo de esta semana resta lo ya movido; con uno antiguo suma lo posterior.
  const llevado = await llevarSaldo(db, banco, hoy);
  const aperturaSemana = llevado.apertura;
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
    banco: { ...leido, fuente, saldoHoy: llevado.hoy as number | null, saldoDesde: llevado.desde },
  };
}
