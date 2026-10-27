import type { TenantTx } from "@opai/db";

import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { dondePuesto } from "./alcance";
import { opcionalAFecha } from "./comun";
import { bloquearPatron } from "./patrones-estructura";
import { errorDePatron, sugerirHoras } from "./puestos-campos";

export const incluir = { patron: true, funcion: true } as const;

/**
 * Vuelve a comprobar, DENTRO de la transacción de escritura, que el patrón elegido sigue activo
 * (TOCTOU, autorrevisión del PR #49, punto 2): `componer` ya lo valida antes de abrir la
 * transacción, pero esa lectura no tiene lock, así que un `core.patrones.set_activo` concurrente
 * podría desactivarlo justo después. `bloquearPatron` serializa con esa escritura. Solo se llama
 * cuando el puesto ELIGE el patrón (crear, o cambiarlo en un update): uno que ya lo tenía sigue
 * editable aunque se desactive después, mismo criterio que `componer`.
 */
export async function patronSigueActivo(tx: TenantTx, patronId: string | null | undefined) {
  if (!patronId) return;
  await bloquearPatron(tx, patronId);
  const p = await tx.patronTurno.findUnique({ where: { id: patronId } });
  if (p && !p.activo) throw reglaDeNegocio(`El patrón "${p.nombre}" está desactivado.`);
}

export async function puestoDe(ctx: Contexto, id: string) {
  // findFirst (no findUnique) para aplicar el alcance por filas (#51, ADR-022): un puesto fuera del
  // alcance del actor se trata como «no encontrado», no como prohibido.
  const p = await ctx.db.puesto.findFirst({ where: { id, AND: [dondePuesto(ctx)] }, include: incluir });
  if (!p) throw noEncontrado("El puesto");
  return p;
}

export async function cargoActivo(ctx: Contexto, cargoId?: string) {
  if (!cargoId) return;
  const c = await ctx.db.cargo.findUnique({ where: { id: cargoId } });
  if (!c) throw noEncontrado("El cargo");
  if (!c.activo) throw reglaDeNegocio(`El cargo "${c.nombre}" está desactivado.`);
}

/**
 * Función del catálogo (bajo RLS: la de otro tenant no existe). Se exige activa solo si se está
 * eligiendo: un puesto que ya la tenía se sigue editando aunque la función se haya desactivado.
 */
async function funcionDe(
  ctx: Contexto,
  funcionId: string | null | undefined,
  exigirActiva: boolean,
) {
  if (!funcionId) return null;
  const f = await ctx.db.funcionPuesto.findUnique({ where: { id: funcionId } });
  if (!f) throw noEncontrado("La función");
  if (exigirActiva && !f.activo) throw reglaDeNegocio(`La función "${f.nombre}" está desactivada.`);
  return f;
}

/** Patrón del catálogo; fija el ciclo (días de trabajo × descanso). Activo solo si se elige. */
async function patronDe(ctx: Contexto, patronId: string | null | undefined, exigirActivo: boolean) {
  if (!patronId) return null;
  const p = await ctx.db.patronTurno.findUnique({ where: { id: patronId } });
  if (!p) throw noEncontrado("El patrón de turno");
  if (exigirActivo && !p.activo) throw reglaDeNegocio(`El patrón "${p.nombre}" está desactivado.`);
  return p;
}

function validarPatron(diasTrabajo: number, diasDescanso: number) {
  const error = errorDePatron(diasTrabajo, diasDescanso);
  if (error) throw reglaDeNegocio(error);
}

export const fechas = (d: {
  vigenteDesde?: string | null | undefined;
  vigenteHasta?: string | null | undefined;
}) => ({
  vigenteDesde: opcionalAFecha(d.vigenteDesde),
  vigenteHasta: opcionalAFecha(d.vigenteHasta),
});

/** Ciclo, horas sugeridas y objetos relacionados a partir del input y los catálogos elegidos. */
export async function componer(
  ctx: Contexto,
  input: {
    funcionId?: string | null | undefined;
    patronId?: string | null | undefined;
    diasTrabajo: number;
    diasDescanso: number;
    horaInicio: string;
    horaFin: string;
    horaInicioNoche?: string | null | undefined;
    horaFinNoche?: string | null | undefined;
    colacionMin?: number | null | undefined;
    colacionFuera?: boolean | null | undefined;
  },
  eligiendo: { funcion: boolean; patron: boolean } = { funcion: true, patron: true },
) {
  const funcion = await funcionDe(ctx, input.funcionId, eligiendo.funcion);
  const patron = await patronDe(ctx, input.patronId, eligiendo.patron);
  const diasTrabajo = patron?.diasTrabajo ?? input.diasTrabajo;
  const diasDescanso = patron?.diasDescanso ?? input.diasDescanso;
  validarPatron(diasTrabajo, diasDescanso);
  const tramos = [
    { horaInicio: input.horaInicio, horaFin: input.horaFin },
    ...(input.horaInicioNoche && input.horaFinNoche
      ? [{ horaInicio: input.horaInicioNoche, horaFin: input.horaFinNoche }]
      : []),
  ];
  const sugerencia = sugerirHoras(
    patron,
    tramos,
    input.colacionMin ?? 0,
    input.colacionFuera ?? false,
  );
  return { funcion, patron, diasTrabajo, diasDescanso, sugerencia };
}

type FilaBase = {
  funcionId: string | null;
  patronId: string | null;
  diasTrabajo: number;
  diasDescanso: number;
  horaInicio: string;
  horaFin: string;
  horaInicioNoche: string | null;
  horaFinNoche: string | null;
  colacionMin: number;
  colacionFuera: boolean;
};
type CambiosPuesto = { [K in keyof FilaBase]?: FilaBase[K] | undefined };

/** Mezcla el puesto actual con los cambios enviados para recalcular ciclo y horas en el update. */
export function mezclarPuesto(actual: FilaBase, c: CambiosPuesto) {
  const tomar = <K extends keyof FilaBase>(k: K): FilaBase[K] =>
    c[k] === undefined ? actual[k] : (c[k] as FilaBase[K]);
  return {
    funcionId: tomar("funcionId"),
    patronId: tomar("patronId"),
    diasTrabajo: c.diasTrabajo ?? actual.diasTrabajo,
    diasDescanso: c.diasDescanso ?? actual.diasDescanso,
    horaInicio: c.horaInicio ?? actual.horaInicio,
    horaFin: c.horaFin ?? actual.horaFin,
    horaInicioNoche: tomar("horaInicioNoche"),
    horaFinNoche: tomar("horaFinNoche"),
    colacionMin: c.colacionMin ?? actual.colacionMin,
    colacionFuera: c.colacionFuera ?? actual.colacionFuera,
  };
}

/** Campos que, si cambian, hacen recalcular las horas semanales sugeridas. */
export const CLAVES_HORAS = [
  "patronId",
  "horaInicio",
  "horaFin",
  "horaInicioNoche",
  "horaFinNoche",
  "colacionMin",
  "colacionFuera",
] as const;

/**
 * Horas semanales de un update: un número explícito manda y null pide recalcular; si no se envían
 * y cambia de verdad el patrón, el horario o la colación, se recalculan; si no, se conservan
 * (undefined). Reenviar los mismos valores (la hoja los manda siempre) no pisa horas manuales.
 */
export function horasDelCambio(
  cambios: { horasSemanales?: number | null | undefined } & {
    [K in (typeof CLAVES_HORAS)[number]]?: unknown;
  },
  actual: { [K in (typeof CLAVES_HORAS)[number]]?: unknown },
  sugerencia: number | null,
) {
  if (cambios.horasSemanales !== undefined) return cambios.horasSemanales ?? sugerencia;
  const distinto = CLAVES_HORAS.some(
    (k) => cambios[k] !== undefined && (cambios[k] ?? null) !== (actual[k] ?? null),
  );
  return distinto ? sugerencia : undefined;
}
