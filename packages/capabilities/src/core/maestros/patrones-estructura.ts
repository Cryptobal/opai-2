import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";

/** Todos los puestos que usan el patrón (activos o no): guardan su ciclo y sus horas. */
export async function puestosConPatron(db: Pick<Contexto["db"], "puesto">, patronId: string) {
  return db.puesto.count({ where: { patronId } });
}

type Estructura = {
  clase?: string | undefined;
  diasTrabajo?: number | undefined;
  diasDescanso?: number | undefined;
  diasSemana?: number[] | undefined;
};

/**
 * Estructura coherente del patrón. Semanal: los días marcados (1–7, sin repetir, al menos uno y
 * a lo más seis) mandan, y trabajo × descanso se derivan de ellos. Cíclico: trabajo y descanso
 * obligatorios, sin días de la semana.
 */
export function estructuraPatron(e: Estructura) {
  const clase = e.clase === "semanal" ? "semanal" : "ciclico";
  const dias = e.diasSemana ?? [];
  if (clase === "semanal") {
    if (dias.length === 0)
      throw reglaDeNegocio("Un patrón semanal necesita al menos un día de la semana.");
    if (new Set(dias).size !== dias.length)
      throw reglaDeNegocio("Los días de la semana del patrón no se pueden repetir.");
    if (dias.length > 6)
      throw reglaDeNegocio("Un patrón semanal necesita al menos un día de descanso.");
    if (
      (e.diasTrabajo !== undefined && e.diasTrabajo !== dias.length) ||
      (e.diasDescanso !== undefined && e.diasDescanso !== 7 - dias.length)
    )
      throw reglaDeNegocio(
        `Con ${dias.length} día(s) marcados el patrón semanal es ${dias.length}×${7 - dias.length}.`,
      );
    const diasSemana = [...dias].sort((a, b) => a - b);
    return { clase, diasTrabajo: dias.length, diasDescanso: 7 - dias.length, diasSemana };
  }
  if (dias.length > 0)
    throw reglaDeNegocio("Un patrón cíclico no usa días de la semana: elige la clase semanal.");
  if (!e.diasTrabajo || !e.diasDescanso)
    throw reglaDeNegocio("Un patrón cíclico necesita días de trabajo y de descanso.");
  return { clase, diasTrabajo: e.diasTrabajo, diasDescanso: e.diasDescanso, diasSemana: [] };
}

/** ¿Cambia la forma del ciclo? (clase, trabajo, descanso o días de la semana). */
export function cambiaEstructura(
  actual: { clase: string; diasTrabajo: number; diasDescanso: number; diasSemana: number[] },
  nueva: { clase: string; diasTrabajo: number; diasDescanso: number; diasSemana: number[] },
) {
  return (
    actual.clase !== nueva.clase ||
    actual.diasTrabajo !== nueva.diasTrabajo ||
    actual.diasDescanso !== nueva.diasDescanso ||
    actual.diasSemana.join(",") !== nueva.diasSemana.join(",")
  );
}

export const EN_USO =
  "El patrón tiene puestos: su clase, ciclo y días no se pueden cambiar. Crea un patrón nuevo y cámbialo en los puestos.";

type FilaEstructura = {
  clase: string;
  diasTrabajo: number;
  diasDescanso: number;
  diasSemana: number[];
};

/** Estructura resultante de un update y si el input trae algún campo de la forma del ciclo. */
export function estructuraDelCambio(actual: FilaEstructura, cambios: Partial<Estructura>) {
  const tocaForma =
    cambios.clase !== undefined ||
    cambios.diasTrabajo !== undefined ||
    cambios.diasDescanso !== undefined ||
    cambios.diasSemana !== undefined;
  const clase = cambios.clase ?? actual.clase;
  const semanal = clase === "semanal";
  const estructura = estructuraPatron({
    clase,
    diasTrabajo: cambios.diasTrabajo ?? (semanal ? undefined : actual.diasTrabajo),
    diasDescanso: cambios.diasDescanso ?? (semanal ? undefined : actual.diasDescanso),
    diasSemana: cambios.diasSemana ?? (clase === actual.clase ? actual.diasSemana : []),
  });
  return { estructura, tocaForma };
}
