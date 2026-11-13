import { z } from "zod";

import { PERMISOS_DESEMPENO } from "./comun";

/** Día del mes en que se cierra solo el mes anterior, si nadie lo cerró antes (CAR-322). */
export const DIA_CIERRE_DEFECTO = 5;

// Ajustes del módulo Desempeño (ADR-018): el manifiesto los declara y Configuración los edita.
export const ajustesDesempeno = z.object({
  dia_cierre: z.number().int().min(1).max(28).default(DIA_CIERRE_DEFECTO).meta({
    etiqueta: "Día de cierre del mes",
    ayuda:
      "Ese día del mes OPAI cierra el mes anterior si nadie lo cerró antes: su resultado queda guardado y ya no cambia. Deja unos días para corregir hechos atrasados.",
    grupo: "Cierre de mes",
    ambito: "tenant",
    permiso: PERMISOS_DESEMPENO.scorecardsManage,
    control: "numero",
  }),
  aviso_bajo_meta: z.boolean().default(false).meta({
    etiqueta: "Avisar a quien quedó bajo la meta",
    ayuda:
      "Al cerrar el mes, OPAI avisa en la campana a cada persona que quedó bajo la meta (si su cargo le muestra su resultado) y a su jefatura directa. El aviso no lleva el puntaje.",
    grupo: "Avisos",
    ambito: "tenant",
    permiso: PERMISOS_DESEMPENO.scorecardsManage,
    control: "switch",
  }),
});
