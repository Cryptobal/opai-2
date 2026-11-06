import { z } from "zod";

import {
  PERMISOS_CORE,
  PIN_BLOQUEO_MINUTOS_DEFECTO,
  PIN_INTENTOS_MAXIMOS_DEFECTO,
} from "@opai/domain";

import { defineAjustes } from "./registro";

/**
 * Bloqueo del PIN de terreno (CAR-78 · B1, D-02): intentos fallidos antes de pausar la credencial y
 * minutos de pausa. Los lee el ingreso (`@opai/auth`, `pin.ts`) con estos mismos límites.
 */
export const AJUSTES_TERRENO = defineAjustes(
  "core",
  z.object({
    terreno_pin_intentos_maximos: z
      .number()
      .int()
      .min(3)
      .max(10)
      .default(PIN_INTENTOS_MAXIMOS_DEFECTO)
      .meta({
        etiqueta: "Intentos fallidos del PIN antes del bloqueo",
        ayuda: "Tras estos intentos incorrectos seguidos, el PIN de terreno queda pausado.",
        grupo: "Terreno",
        ambito: "tenant",
        permiso: PERMISOS_CORE.personasManage,
        control: "numero",
      }),
    terreno_pin_bloqueo_minutos: z
      .number()
      .int()
      .min(5)
      .max(1440)
      .default(PIN_BLOQUEO_MINUTOS_DEFECTO)
      .meta({
        etiqueta: "Minutos de bloqueo del PIN",
        ayuda: "Cuánto tiempo queda pausado el PIN de terreno tras superar los intentos.",
        grupo: "Terreno",
        ambito: "tenant",
        permiso: PERMISOS_CORE.personasManage,
        control: "numero",
      }),
  }),
);
