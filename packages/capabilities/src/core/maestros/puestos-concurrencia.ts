import type { TenantTx } from "@opai/db";

import { noEncontrado, reglaDeNegocio } from "../../errores";
import { bloquearPatron } from "./patrones-estructura";
import { sugerirHoras } from "./puestos-campos";

/** Tramos (día y, si rota, noche) a partir de los campos de horario del puesto. */
export function tramosDe(entrada: {
  horaInicio: string;
  horaFin: string;
  horaInicioNoche?: string | null | undefined;
  horaFinNoche?: string | null | undefined;
}) {
  return [
    { horaInicio: entrada.horaInicio, horaFin: entrada.horaFin },
    ...(entrada.horaInicioNoche && entrada.horaFinNoche
      ? [{ horaInicio: entrada.horaInicioNoche, horaFin: entrada.horaFinNoche }]
      : []),
  ];
}

/**
 * Bloquea el patrón elegido y lo vuelve a leer DENTRO de la transacción de escritura (TOCTOU,
 * review 5662449808 punto 1): `componer` calcula el ciclo y las horas sugeridas ANTES de abrir la
 * transacción, con una lectura sin lock; si `core.patrones.update` cambia la estructura del patrón
 * justo después (todavía puede, mientras el patrón no tenga puestos) o `core.patrones.set_activo`
 * lo desactiva, esa sugerencia queda vieja. El ciclo (días de trabajo y descanso) ya lo corrige el
 * trigger `puesto_ciclo_del_patron` (20261028040100) al escribir el puesto, con un `FOR SHARE` sobre
 * la misma fila; las horas sugeridas no tienen trigger, así que se recalculan aquí con la lectura
 * bloqueada (mismo advisory lock que usan `core.patrones.update` al tocar la forma y
 * `core.patrones.set_activo`). Solo se llama cuando el puesto ELIGE el patrón (crear, o cambiarlo en
 * un update): uno que ya lo tenía sigue editable sin releer, porque un patrón en uso no puede
 * cambiar de forma (`patron_en_uso_inmutable`) y desactivarlo no afecta a quien ya lo tiene.
 */
export async function patronBloqueadoParaHoras(
  tx: TenantTx,
  patronId: string | null | undefined,
  entrada: {
    horaInicio: string;
    horaFin: string;
    horaInicioNoche?: string | null | undefined;
    horaFinNoche?: string | null | undefined;
    colacionMin?: number | null | undefined;
    colacionFuera?: boolean | null | undefined;
  },
) {
  if (!patronId) return null;
  await bloquearPatron(tx, patronId);
  const p = await tx.patronTurno.findUnique({ where: { id: patronId } });
  if (!p) throw noEncontrado("El patrón de turno");
  if (!p.activo) throw reglaDeNegocio(`El patrón "${p.nombre}" está desactivado.`);
  const sugerencia = sugerirHoras(
    p,
    tramosDe(entrada),
    entrada.colacionMin ?? 0,
    entrada.colacionFuera ?? false,
  );
  return { diasTrabajo: p.diasTrabajo, diasDescanso: p.diasDescanso, sugerencia };
}
