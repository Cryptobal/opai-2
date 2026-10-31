import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineAjustes } from "./registro";

/**
 * Ajustes de Personas, en Configuración › Módulos › Personas. El plazo máximo de vigencia de la
 * marca P1 "No recontratar" (corrección del abogado, 30-oct 15:33 CLT) queda configurable pero SIN
 * valor de negocio decidido: 0 = sin tope, y la capacidad no lo exige todavía. TODO(decisión Carlos):
 * fijar el plazo máximo (o confirmar que no lo hay) antes de aplicarlo como validación.
 */
export const AJUSTES_PERSONAS = defineAjustes(
  "core",
  z.object({
    personas_no_recontratar_vigencia_maxima_dias: z
      .number()
      .int()
      .min(0)
      .max(36_500)
      .default(0)
      .meta({
        etiqueta: 'Plazo máximo de vigencia de la marca "No recontratar" (días)',
        ayuda:
          "TODO(decisión Carlos): sin plazo máximo definido. Con 0 no hay tope; la fecha de vencimiento la fija quien marca, por persona.",
        grupo: "Personas",
        ambito: "tenant",
        permiso: PERMISOS_CORE.personasNoRecontratarManage,
        soloPersonas: true,
        control: "numero",
      }),
  }),
);
