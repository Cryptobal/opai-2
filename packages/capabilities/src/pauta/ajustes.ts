import { z } from "zod";

import { DESCANSO_MINIMO_HORAS_DEFECTO, LIMITE_MENSUAL_HORAS_DEFECTO } from "@opai/domain";

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
