import type { Contexto } from "@opai/capabilities";

import { ETIQUETA_JORNADA, REGLAS_DESCANSO } from "../domain";
import { emitir } from "./alertas-art45";
import { fechaDe, type DiaCalculado } from "./dias-calculo";
import { fechaHora } from "./formato";

/**
 * Avisa una sola vez por persona y día que el descanso entre jornadas quedó bajo el mínimo de su tipo de jornada
 * (teletrabajo: 12 h de desconexión). La clave única (`descanso:persona:fecha`) hace que recalcular el día no repita el aviso.
 */
export async function alertarDescanso(ctx: Contexto, d: DiaCalculado, zona: string, ahora = new Date()): Promise<boolean> {
  const minimo = REGLAS_DESCANSO[d.tipoJornada].entreJornadasHoras;
  if (!d.descansoInsuficiente || minimo === null || !d.entrada) return false;
  // Solo hoy y ayer: recalcular un día antiguo (p. ej. al vencer una corrección) no manda un aviso tardío.
  if (d.fecha < fechaDe(new Date(ahora.getTime() - 86_400_000), zona)) return false;
  return emitir(
    ctx, "descanso_insuficiente", `descanso:${d.personaId}:${d.fecha}`, d.personaId,
    { ...(d.instalacionId ? { instalacionId: d.instalacionId } : {}), ...(d.turnoEsperadoId ? { turnoEsperadoId: d.turnoEsperadoId } : {}) },
    { jornada: { tipo: ETIQUETA_JORNADA[d.tipoJornada], descanso_minimo_horas: String(minimo) }, dia: { entrada: fechaHora(d.entrada, zona) } },
  );
}
