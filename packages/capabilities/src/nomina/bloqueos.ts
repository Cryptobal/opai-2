import { etiquetaPeriodo } from "@opai/domain";

import type { TenantTx } from "@opai/db";

import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import { exigirPeriodoAbierto } from "./novedades-util";

/**
 * Bloqueos de fila de Nómina (pendientes del Revisor de #183). Las validaciones de estado se hacen
 * con el período ya bloqueado dentro de la transacción: cerrar, anular o cargar novedades se
 * serializan por período y nadie escribe en un mes que otro acaba de cerrar.
 *
 * Orden de bloqueo único, para no provocar interbloqueos: primero los períodos (por id ascendente)
 * y después los préstamos. La concurrencia real se prueba en `nomina-db.test.ts`; la base en
 * memoria solo devuelve la fila.
 */
export async function bloquearPeriodo(tx: TenantTx, tenantId: string, id: string) {
  await tx.$queryRaw`SELECT id FROM nomina.periodos /* nomina:bloqueo-periodo */ WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE`;
  const p = await tx.nominaPeriodo.findUnique({ where: { id } });
  if (!p) throw noEncontrado("El período");
  return p;
}

/** Bloquea el período y exige que siga admitiendo novedades (abierto o en revisión). */
export async function bloquearPeriodoAbierto(tx: TenantTx, tenantId: string, id: string) {
  const p = await bloquearPeriodo(tx, tenantId, id);
  exigirPeriodoAbierto(p);
  return p;
}

/** Bloquea un préstamo; hay que tener antes los períodos que toca. */
export async function bloquearPrestamo(tx: TenantTx, tenantId: string, id: string) {
  await tx.$queryRaw`SELECT id FROM nomina.prestamos /* nomina:bloqueo-prestamo */ WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE`;
  const p = await tx.nominaPrestamo.findUnique({ where: { id } });
  if (!p) throw noEncontrado("El préstamo");
  return p;
}

type PeriodoEstado = { anio: number; mes: number; estado: string };

/** Un préstamo no se cancela mientras alguna de sus cuotas esté en un período cerrado o pagado. */
export function exigirSinPeriodosCerrados(periodos: readonly PeriodoEstado[]): void {
  const cerrado = periodos.find((p) => p.estado === "cerrado" || p.estado === "pagado");
  if (cerrado)
    throw reglaDeNegocio(`${etiquetaPeriodo(cerrado.anio, cerrado.mes)} ya está cerrado: reábrelo antes de cancelar el préstamo.`);
}

export function cambioConcurrente(): Error {
  return conflicto("Otro usuario modificó los datos mientras trabajabas; vuelve a intentar.");
}
