import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { opcionalAFecha } from "./comun";
import { errorDePatron, sugerirHoras } from "./puestos-campos";

export const incluir = { patron: true, funcion: true } as const;

export async function puestoDe(ctx: Contexto, id: string) {
  const p = await ctx.db.puesto.findUnique({ where: { id }, include: incluir });
  if (!p) throw noEncontrado("El puesto");
  return p;
}

export async function cargoActivo(ctx: Contexto, cargoId?: string) {
  if (!cargoId) return;
  const c = await ctx.db.cargo.findUnique({ where: { id: cargoId } });
  if (!c) throw noEncontrado("El cargo");
  if (!c.activo) throw reglaDeNegocio(`El cargo "${c.nombre}" está desactivado.`);
}

/** Función del catálogo (activa). Devuelve la fila para mostrar su nombre sin otra consulta. */
async function funcionActiva(ctx: Contexto, funcionId?: string | null) {
  if (!funcionId) return null;
  const f = await ctx.db.funcionPuesto.findUnique({ where: { id: funcionId } });
  if (!f) throw noEncontrado("La función");
  if (!f.activo) throw reglaDeNegocio(`La función "${f.nombre}" está desactivada.`);
  return f;
}

/** Patrón del catálogo (activo). Fija el ciclo (días de trabajo × descanso) del puesto. */
async function patronActivo(ctx: Contexto, patronId?: string | null) {
  if (!patronId) return null;
  const p = await ctx.db.patronTurno.findUnique({ where: { id: patronId } });
  if (!p) throw noEncontrado("El patrón de turno");
  if (!p.activo) throw reglaDeNegocio(`El patrón "${p.nombre}" está desactivado.`);
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
) {
  const funcion = await funcionActiva(ctx, input.funcionId);
  const patron = await patronActivo(ctx, input.patronId);
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
