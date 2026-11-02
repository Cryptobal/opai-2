import type { Contexto } from "@opai/capabilities";
import { noEncontrado, reglaDeNegocio } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { lunesDe, type Capa, type CeldaFlujo, type FilaFlujo, type Seccion } from "../domain";

import { aNumeroSeguro } from "./esquemas";

/** Id de relleno de las vistas previas (dry_run): no existe fila, pero cumple el esquema de salida. */
export const ID_VISTA_PREVIA = "00000000-0000-0000-0000-000000000000";

export const aIso = (d: Date | string): string =>
  (typeof d === "string" ? d : d.toISOString()).slice(0, 10);
export const aFecha = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

type AjustesDb = {
  saldoInicial: bigint | number;
  umbral: bigint | number;
  desde: Date;
  toleranciaCierre: bigint | number;
  horizonteSemanas: number;
  calendarioPagos: unknown;
  avisoActivo: boolean;
  avisoUmbral: bigint | number;
  metaCeldaMs: number;
  metaGuardadoP95Ms: number;
  metaCargaInicialS: number;
  metasVisibles: boolean;
};

const calendarioDefecto = () => ({});

export function vistaAjustes(a: AjustesDb) {
  const cal = (a.calendarioPagos ?? {}) as Record<string, number | undefined>;
  return {
    saldoInicial: aNumeroSeguro(a.saldoInicial),
    umbral: aNumeroSeguro(a.umbral),
    desde: aIso(a.desde),
    toleranciaCierre: aNumeroSeguro(a.toleranciaCierre),
    horizonteSemanas: a.horizonteSemanas,
    calendarioPagos: {
      ...(cal.remuneraciones != null ? { remuneraciones: cal.remuneraciones } : {}),
      ...(cal.imposiciones != null ? { imposiciones: cal.imposiciones } : {}),
      ...(cal.anticipos != null ? { anticipos: cal.anticipos } : {}),
      ...(cal.iva != null ? { iva: cal.iva } : {}),
    },
    avisoActivo: a.avisoActivo,
    avisoUmbral: aNumeroSeguro(a.avisoUmbral),
    metaCeldaMs: a.metaCeldaMs,
    metaGuardadoP95Ms: a.metaGuardadoP95Ms,
    metaCargaInicialS: a.metaCargaInicialS,
    metasVisibles: a.metasVisibles,
  };
}

/** Ajustes del tenant; si aún no hay, los de partida (saldo 0, umbral 0, desde la semana actual). */
export async function ajustesDe(ctx: Contexto) {
  const a = await ctx.db.flujoAjustes.findFirst({});
  if (a) return vistaAjustes(a);
  return vistaAjustes({
    saldoInicial: 0,
    umbral: 0,
    desde: aFecha(lunesDe(new Date().toISOString().slice(0, 10))),
    toleranciaCierre: 1000,
    horizonteSemanas: 12,
    calendarioPagos: calendarioDefecto(),
    avisoActivo: false,
    avisoUmbral: 0,
    metaCeldaMs: 100,
    metaGuardadoP95Ms: 1000,
    metaCargaInicialS: 2,
    metasVisibles: true,
  });
}

/** Serializa sellado y cambios de celdas de la misma semana (CAR-136). */
export async function bloquearSemanaFlujo(tx: TenantTx, ctx: Contexto, semana: string): Promise<void> {
  try {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${ctx.tenantId}:${semana}`}, 0))`;
  } catch {
    // Memoria de prueba (sin Postgres): no hay advisory lock; el mock serializa por transacción.
  }
}

/** Semanas selladas del tenant, para impedir cambios en ellas. */
export async function selladasDe(ctx: Contexto): Promise<Set<string>> {
  const cierres = await ctx.db.flujoCierre.findMany({ where: { sellada: true } });
  return new Set(cierres.map((c) => aIso(c.semana)));
}

export async function semanaSelladaEnTx(tx: TenantTx, semana: string): Promise<boolean> {
  const c = await tx.flujoCierre.findFirst({ where: { semana: aFecha(semana), sellada: true } });
  return !!c;
}

export async function exigirSemanaAbierta(ctx: Contexto, semana: string): Promise<void> {
  if ((await selladasDe(ctx)).has(semana))
    throw reglaDeNegocio("La semana está sellada: reábrela con su motivo antes de cambiarla.");
}

export async function filaDe(ctx: Contexto, id: string) {
  const f = await ctx.db.flujoFila.findFirst({ where: { id } });
  if (!f) throw noEncontrado("La fila del flujo");
  return f;
}

/** Filas activas y celdas de un rango, ya en la forma del dominio. */
export async function cargarFlujo(ctx: Contexto, desde: string, hasta: string, tx?: TenantTx) {
  const db = tx ?? ctx.db;
  const filas = await db.flujoFila.findMany({
    where: { activa: true },
    orderBy: [{ orden: "asc" }, { etiqueta: "asc" }],
  });
  const celdas = await db.flujoCelda.findMany({
    where: { semana: { gte: aFecha(desde), lte: aFecha(hasta) } },
  });
  const dominio: FilaFlujo[] = filas.map((f) => ({
    id: f.id,
    seccion: f.seccion as Seccion,
    arrastre: f.arrastre,
  }));
  const celdasDom: CeldaFlujo[] = celdas.map((c) => ({
    filaId: c.filaId,
    semana: aIso(c.semana),
    capa: c.capa as Capa,
    monto: aNumeroSeguro(c.monto),
  }));
  return { filas, celdas, dominio, celdasDom };
}
