import { Prisma, type TenantTx } from "@opai/db";

import { definidos } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import type { Operacion } from "./ajustar-ops";
import { dondeSeccion } from "./comun";

// Validaciones y datos de las líneas de `cpq.cotizaciones.ajustar` (§4, R21).

export type Linea = Extract<Operacion, { op: "agregar_linea" | "actualizar_linea" }>;

/** Cargo y patrón del tenant (la RLS acota la búsqueda); de otra empresa responde NOT_FOUND. */
export async function referenciasLinea(tx: TenantTx, op: Linea) {
  if (op.cargoId) {
    const c = await tx.cargo.findUnique({ where: { id: op.cargoId }, select: { id: true } });
    if (!c) throw noEncontrado("El cargo");
  }
  if (op.patronId) {
    const p = await tx.patronTurno.findUnique({ where: { id: op.patronId }, select: { id: true } });
    if (!p) throw noEncontrado("El patrón");
  }
  if (op.personasPorPosicion != null && !op.motivoPersonas)
    throw reglaDeNegocio("Sobrescribir las personas por posición exige un motivo (R21).");
}

/** Sección de la versión en el alcance del actor (ADR-022), o NOT_FOUND. */
export async function seccionDe(ctx: Contexto, tx: TenantTx, versionId: string, id: string) {
  const s = await tx.seccionCotizacion.findFirst({
    where: { AND: [{ id, versionId }, dondeSeccion(ctx)] },
  });
  if (!s) throw noEncontrado("La sección");
  return s;
}

/** Línea de la versión cuya sección está en el alcance del actor, o NOT_FOUND (sin enumeración). */
export async function lineaDe(ctx: Contexto, tx: TenantTx, versionId: string, id: string) {
  const l = await tx.lineaCotizacion.findFirst({ where: { id, versionId } });
  const visible =
    l &&
    (await tx.seccionCotizacion.count({
      where: { AND: [{ id: l.seccionId }, dondeSeccion(ctx)] },
    }));
  if (!l || !visible) throw noEncontrado("La línea");
  return l;
}

/** Campos de la línea presentes en la operación; `horario: null` se guarda como NULL de SQL. */
export function datosLinea(op: Linea) {
  const { horario, ...resto } = op;
  return definidos({
    nombre: resto.nombre,
    grupo: resto.grupo,
    cantidad: resto.cantidad,
    cargoId: resto.cargoId,
    patronId: resto.patronId,
    personasPorPosicion: resto.personasPorPosicion,
    motivoPersonas: resto.motivoPersonas,
    sueldoBruto: resto.sueldoBruto,
    costoUnitario: resto.costoUnitario,
    recurrencia: resto.recurrencia,
    margenPropio: resto.margenPropio,
    visibleCliente: resto.visibleCliente,
    habilitada: resto.habilitada,
    horario: horario === null ? Prisma.DbNull : horario,
  });
}

/** Defectos explícitos de una línea nueva (la base en memoria no aplica los de Prisma). */
export const LINEA_NUEVA = {
  grupo: null,
  habilitada: true,
  visibleCliente: true,
  cantidad: 1,
  recurrencia: "mensual",
  cargoId: null,
  patronId: null,
  personasPorPosicion: null,
  motivoPersonas: null,
  sueldoBruto: null,
  costoUnitario: null,
  margenPropio: null,
};
