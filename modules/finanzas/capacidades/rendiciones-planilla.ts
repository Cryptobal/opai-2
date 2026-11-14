import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import type { CeldaFlujo } from "../domain";
import type { celdaSchema } from "./esquemas";
import { FILA_RENDICIONES } from "./filas-virtuales";
import type { z } from "zod";

type Vista = z.infer<typeof celdaSchema>;

/** Lotes que ya se aprobaron para pagar y todavía no se pagan ni se anulan (CAR-178). */
const POR_PAGAR = ["aprobado", "generado"];

/**
 * Rendiciones por pagar como egreso comprometido (ADR-113 punto 3): cada lote de pago aprobado o con la nómina generada
 * cuenta en la semana en curso hasta que se marca pagado (desde ahí lo trae la cartola) o se anula (se retira). Las
 * semanas pasadas se leen de la cartola, así que un lote atrasado no se cuenta dos veces. Solo lectura; con
 * Rendiciones apagado no hay lotes y la fila no aparece.
 */
export async function celdasRendiciones(
  ctx: Contexto,
  hoy: string,
  semanas: readonly string[],
  tx?: TenantTx,
): Promise<{ dominio: CeldaFlujo[]; vista: Vista[] }> {
  if (!semanas.includes(hoy)) return { dominio: [], vista: [] };
  const lotes = await (tx ?? ctx.db).lotePago.findMany({
    where: { estado: { in: POR_PAGAR } },
    select: { id: true, codigo: true, estado: true, totalClp: true, cantidad: true },
    orderBy: { codigo: "asc" },
  });
  const dominio: CeldaFlujo[] = [];
  const vista: Vista[] = [];
  for (const l of lotes) {
    if (l.totalClp <= 0) continue;
    dominio.push({ filaId: FILA_RENDICIONES, semana: hoy, capa: "comprometido", monto: l.totalClp });
    const etapa = l.estado === "generado" ? "nómina generada" : "aprobado";
    const nota = `Lote LP-${l.codigo} · ${l.cantidad} ${l.cantidad === 1 ? "rendición" : "rendiciones"} · ${etapa}, por pagar`;
    vista.push({ id: l.id, filaId: FILA_RENDICIONES, semana: hoy, capa: "comprometido", monto: l.totalClp, nota });
  }
  return { dominio, vista };
}
