import { createHash } from "node:crypto";

import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";
import type { z } from "zod";

import type { CeldaFlujo } from "../domain";
import { estadosPorFila, ocurrenciasDe, type CargoFila, type EstadoOcurrencia, type Frecuencia } from "../domain/recurrentes";
import { cuotasDelFlujo } from "../domain/recurrentes-semana";
import { aNumeroSeguro, type celdaSchema } from "./esquemas";
import { aFecha, aIso } from "./util";

const DIA_MS = 86_400_000;
const mas = (iso: string, dias: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + dias * DIA_MS).toISOString().slice(0, 10);
const VENCIDAS_DIAS = 31;
const ETIQUETA = { pagada: "pagada esta semana", parcial: "saldo por pagar", proyectada: "por pagar" } as const;

function idEstable(texto: string): string {
  const h = createHash("sha1").update(texto).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * Cuotas de los gastos recurrentes desde la semana en curso hasta la última semana pedida (CAR-349). Se derivan al
 * leer (ADR-026) y se cruzan con los cargos del banco conciliados a su fila: lo pagado antes del lunes ya está en el
 * saldo y no se proyecta. Una sola consulta de recurrentes y una de cargos. Solo lectura.
 */
export async function celdasRecurrentes(
  ctx: Contexto,
  lunes: string,
  semanas: readonly string[],
  tx?: TenantTx,
): Promise<{ dominio: CeldaFlujo[]; vista: z.infer<typeof celdaSchema>[] }> {
  const futuras = semanas.filter((s) => s >= lunes);
  if (!futuras.length) return { dominio: [], vista: [] };
  const db = tx ?? ctx.db;
  const recurrentes = await db.flujoRecurrente.findMany({ where: { activa: true, fila: { activa: true } }, orderBy: [{ inicio: "asc" }, { id: "asc" }] });
  if (!recurrentes.length) return { dominio: [], vista: [] };
  const desde = mas(lunes, -VENCIDAS_DIAS);
  const hasta = mas(futuras.at(-1) as string, 6);
  const conc = await db.conciliacionBanco.findMany({
    where: {
      tipoEnlace: "flujo_fila",
      activa: true,
      confirmada: true,
      enlaceId: { in: [...new Set(recurrentes.map((r) => r.filaId))] },
      movimiento: { estado: { not: "ignorado" }, fecha: { gte: aFecha(mas(desde, -31)), lte: aFecha(mas(hasta, 31)) } },
    },
    select: { movimientoId: true, enlaceId: true, monto: true, movimiento: { select: { fecha: true } } },
  });
  const cargoDe = new Map(conc.map((c) => [c.movimientoId, { fecha: aIso(c.movimiento.fecha), monto: Math.abs(aNumeroSeguro(c.monto)) }] as const));
  const cuotas = new Map(
    recurrentes.map((r) => {
      const regla = { frecuencia: r.frecuencia as Frecuencia, diaDelMes: r.diaDelMes, inicio: aIso(r.inicio), fin: r.fin ? aIso(r.fin) : null, repeticiones: r.repeticiones };
      return [r.id, { id: r.id, fechas: ocurrenciasDe(regla, desde, hasta), monto: aNumeroSeguro(r.monto), ventana: { diasAntes: r.ventanaAntes, diasDespues: r.ventanaDespues } }] as const;
    }),
  );
  const estados = new Map<string, EstadoOcurrencia[]>();
  for (const filaId of new Set(recurrentes.map((r) => r.filaId))) {
    const cargos: CargoFila[] = conc.filter((c) => c.enlaceId === filaId).map((c) => ({ id: c.movimientoId, ...(cargoDe.get(c.movimientoId) as { fecha: string; monto: number }) }));
    const reglas = recurrentes.filter((r) => r.filaId === filaId).map((r) => cuotas.get(r.id)).filter((x) => x !== undefined);
    for (const [id, e] of estadosPorFila(reglas, cargos)) estados.set(id, e);
  }
  const dominio: CeldaFlujo[] = [];
  const vista: z.infer<typeof celdaSchema>[] = [];
  for (const r of recurrentes) {
    for (const c of cuotasDelFlujo(estados.get(r.id) ?? [], aNumeroSeguro(r.monto), (id) => cargoDe.get(id), lunes)) {
      if (!futuras.includes(c.semana)) continue;
      dominio.push({ filaId: r.filaId, semana: c.semana, capa: "comprometido", monto: c.monto });
      vista.push({ id: idEstable(`recurrente:${r.id}:${c.fecha}`), filaId: r.filaId, semana: c.semana, capa: "comprometido", monto: c.monto, nota: `${r.concepto} · cuota del ${c.fecha} · ${ETIQUETA[c.estado]}` });
    }
  }
  return { dominio, vista };
}
