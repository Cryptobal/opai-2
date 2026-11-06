import type { TenantTx } from "@opai/db";

import type { SaldoBanco } from "./bancos/saldo-banco";
import { aNumeroSeguro } from "./esquemas";
import { aFecha, aIso, hoyIso } from "./util";

/** Un movimiento de esta semana que el saldo del banco de hoy ya incluye. */
export type MovidoSemana = {
  id: string;
  cuentaId: string;
  fecha: string;
  monto: number;
  estado: string;
  texto: string;
};

/**
 * Lo movido en la semana en curso que ya está en el saldo del banco: por cada cuenta que suma en él, los movimientos
 * desde el lunes hasta hoy y hasta la fecha de ESE saldo (lo posterior no está en él). La apertura de la semana los
 * resta (ADR-073); los abonos vuelven a la semana como celdas reales y los cargos los cubre la proyección.
 */
export async function movidosDeLaSemana(db: TenantTx, banco: SaldoBanco, lunes: string): Promise<MovidoSemana[]> {
  const filas = await db.movimientoBancario.findMany({
    where: {
      estado: { not: "ignorado" },
      cuentaId: { in: banco.cuentasConSaldo.map((c) => c.cuentaId) },
      fecha: { gte: aFecha(lunes), lte: aFecha(hoyIso()) },
    },
    select: { id: true, cuentaId: true, fecha: true, monto: true, estado: true, glosa: true, referencia: true },
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
  });
  const corte = new Map(banco.cuentasConSaldo.map((c) => [c.cuentaId, c.fecha] as const));
  return filas
    .filter((m) => aIso(m.fecha) <= (corte.get(m.cuentaId) ?? ""))
    .map((m) => ({
      id: m.id,
      cuentaId: m.cuentaId,
      fecha: aIso(m.fecha),
      monto: aNumeroSeguro(m.monto),
      estado: m.estado,
      texto: `${m.glosa} ${m.referencia ?? ""}`.trim(),
    }));
}
