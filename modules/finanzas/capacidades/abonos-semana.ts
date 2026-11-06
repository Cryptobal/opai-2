import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";
import type { z } from "zod";

import type { CeldaFlujo } from "../domain";
import { derivadasBanco } from "./derivadas/banco";
import type { celdaSchema } from "./esquemas";
import type { MovidoSemana } from "./semana-en-curso";

/**
 * Abonos ya movidos esta semana. El saldo del banco de hoy los incluye y la apertura de la semana los resta, así que
 * vuelven como ingreso real: sin esto, un abono conciliado (cuya factura ya no se proyecta) o uno cuya factura se
 * oculta por coincidencia segura faltaría en la semana y el saldo final quedaría corto por ese monto (ADR-073).
 */
export async function celdasAbonosSemana(
  ctx: Contexto,
  lunes: string,
  movidos: readonly MovidoSemana[],
  tx?: TenantTx,
): Promise<{ dominio: CeldaFlujo[]; vista: z.infer<typeof celdaSchema>[] }> {
  const ids = new Set(movidos.filter((m) => m.monto > 0).map((m) => m.id));
  if (!ids.size) return { dominio: [], vista: [] };
  const vista = (await derivadasBanco(ctx, lunes, lunes, tx)).filter((c) => ids.has(c.id));
  return { dominio: vista.map((c) => ({ filaId: c.filaId, semana: c.semana, capa: "real" as const, monto: c.monto })), vista };
}
