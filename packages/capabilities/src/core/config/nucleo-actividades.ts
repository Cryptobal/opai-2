import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineAjustes } from "./registro";

/** Ajustes de Actividad y tareas (CAR-162). Silencio por defecto (ADR-020). */
export const AJUSTES_ACTIVIDADES = defineAjustes(
  "core",
  z.object({
    actividades_aviso_responsables: z.boolean().default(false).meta({
      etiqueta: "Avisar en la campana a los responsables de una tarea vencida",
      ayuda:
        "Apagado por defecto. Para avisar por correo o a otros roles, usa la regla «Tarea vencida» en Comunicaciones.",
      grupo: "Comunicaciones",
      ambito: "tenant",
      permiso: PERMISOS_CORE.comunicacionesManage,
      control: "switch",
    }),
  }),
);
