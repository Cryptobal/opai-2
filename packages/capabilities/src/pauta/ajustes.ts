import { z } from "zod";

import { DESCANSO_MINIMO_HORAS_DEFECTO, LIMITE_MENSUAL_HORAS_DEFECTO } from "@opai/domain";

import { valoresEfectivos, type CampoAjuste } from "../core/config";
import { campoAjuste } from "../core/config/catalogo";
import type { Contexto } from "../types";

// Ajustes del módulo Pauta (ADR-018, ADR-021). El tope semanal NO es un ajuste: sale del indicador
// «jornada» del motor de sueldos, con vigencia (ADR-056). Aquí van el tope mensual y el descanso
// mínimo entre turnos, que cada empresa puede ajustar.
const PERMISO = "pauta:write";

export const ajustesPauta = z.object({
  limite_mensual_horas: z.number().int().min(100).max(300).default(LIMITE_MENSUAL_HORAS_DEFECTO).meta({
    etiqueta: "Tope mensual de horas de turno",
    ayuda: "La Pauta alerta en rojo cuando una persona supera estas horas programadas en el mes (180 por defecto).",
    grupo: "Alertas de horas",
    ambito: "tenant",
    permiso: PERMISO,
    control: "numero",
  }),
  descanso_minimo_horas: z.number().int().min(1).max(24).default(DESCANSO_MINIMO_HORAS_DEFECTO).meta({
    etiqueta: "Descanso mínimo entre turnos (horas)",
    ayuda: "La Pauta alerta cuando entre el fin de un turno y el inicio del siguiente hay menos horas (12 por defecto).",
    grupo: "Alertas de horas",
    ambito: "tenant",
    permiso: PERMISO,
    control: "numero",
  }),
});

/**
 * Tope mensual y descanso mínimo vigentes de la empresa. Si el módulo aún no está registrado (un
 * proceso que arma el registro a mano), rigen los defectos del esquema, no un error.
 */
export async function ajustesDeHoras(ctx: Contexto) {
  const campos = [campoAjuste("pauta", "limite_mensual_horas"), campoAjuste("pauta", "descanso_minimo_horas")];
  if (campos.some((c) => !c))
    return { limiteMensualHoras: LIMITE_MENSUAL_HORAS_DEFECTO, descansoMinimoHoras: DESCANSO_MINIMO_HORAS_DEFECTO };
  const v = await valoresEfectivos(ctx, campos as CampoAjuste[]);
  return {
    limiteMensualHoras: v.get("pauta.limite_mensual_horas")?.valor as number,
    descansoMinimoHoras: v.get("pauta.descanso_minimo_horas")?.valor as number,
  };
}
