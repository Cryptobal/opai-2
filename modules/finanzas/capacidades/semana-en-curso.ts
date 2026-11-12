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
 * Lo movido en la semana en curso hasta hoy, en las cuentas que suman en el saldo del banco. La apertura de la semana
 * es el saldo al cierre del domingo (`llevarSaldo`, CAR-343), así que nada de esto está en ella: los abonos vuelven a
 * la semana como celdas reales y los cargos los cubre la proyección (ADR-073). Antes se cortaba en la fecha del saldo
 * de cada cuenta y un abono posterior a un saldo antiguo se perdía.
 */
export async function movidosDeLaSemana(
  db: TenantTx,
  banco: SaldoBanco,
  lunes: string,
): Promise<MovidoSemana[]> {
  const filas = await db.movimientoBancario.findMany({
    where: {
      estado: { not: "ignorado" },
      cuentaId: { in: banco.cuentasConSaldo.map((c) => c.cuentaId) },
      fecha: { gte: aFecha(lunes), lte: aFecha(hoyIso()) },
    },
    select: {
      id: true,
      cuentaId: true,
      fecha: true,
      monto: true,
      estado: true,
      glosa: true,
      referencia: true,
    },
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
  });
  return filas.map((m) => ({
    id: m.id,
    cuentaId: m.cuentaId,
    fecha: aIso(m.fecha),
    monto: aNumeroSeguro(m.monto),
    estado: m.estado,
    texto: `${m.glosa} ${m.referencia ?? ""}`.trim(),
  }));
}
